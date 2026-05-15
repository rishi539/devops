#!/usr/bin/env python3
"""
Simple Flask API that accepts a YouTube URL and returns transcript text.

Endpoint:
  POST /transcribe
  JSON body: { "url": "<youtube-url-or-id>", "model": "small", "keep_audio": false }

Requirements:
 - ffmpeg (system), yt-dlp, faster-whisper, youtube-transcript-api, flask
 - On first run faster-whisper will download model weights (hundreds of MB).
 - This runs synchronously (the request will wait until transcription completes).
"""

from flask import Flask, request, jsonify
import tempfile
import os
import subprocess
from pathlib import Path
from typing import Optional, Tuple, List

app = Flask(__name__)

# ------------------ Helper: video id ------------------
def get_video_id(url_or_id: str) -> str:
    if "youtube.com" in url_or_id or "youtu.be" in url_or_id:
        if "v=" in url_or_id:
            return url_or_id.split("v=")[1].split("&")[0]
        elif "youtu.be/" in url_or_id:
            return url_or_id.split("youtu.be/")[1].split("?")[0]
    return url_or_id

# ------------------ Captions check (hardcoded variants + auto-translate) ------------------
def try_youtube_captions(video_id: str) -> Optional[dict]:
    """
    Try to fetch YouTube captions using youtube_transcript_api v1.2.x.
    Prefers English captions (manual then auto-generated).
    Falls back to any available transcript.

    Returns dict or None. Returned dict fields:
      - source: descriptive source label
      - language: returned language code
      - text: full transcript text
      - segments: the raw fetched segments
    """
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
    except Exception as e:
        print("youtube_transcript_api import failed:", e)
        return None

    # Helper: safely extract text whether segment is dict-like or object-like
    def _seg_text_safe(seg):
        if isinstance(seg, dict):
            return seg.get("text", "")
        text = getattr(seg, "text", None)
        if text is not None:
            return text
        return str(seg)

    # --- Try simple fetch first (auto-selects best English transcript) ---
    try:
        api = YouTubeTranscriptApi()
        fetched = api.fetch(video_id)
        text = " ".join(_seg_text_safe(s) for s in fetched)
        if text.strip():
            print(f"Fetched transcript directly for {video_id}")
            return {
                "source": "captions-auto",
                "language": "en",
                "text": text,
                "segments": fetched
            }
    except Exception as e:
        print(f"Direct fetch failed: {e}")

    # --- Fallback: list transcripts and pick the best one ---
    try:
        api = YouTubeTranscriptApi()
        transcript_list = api.list(video_id)

        english_variants = [
            "en", "en-US", "en-IN", "en-GB", "en-AU", "en-CA", "en-NZ", "en-ZA"
        ]

        # 1) Try English manual
        try:
            t = transcript_list.find_manually_created(english_variants)
            fetched = t.fetch()
            text = " ".join(_seg_text_safe(s) for s in fetched)
            if text.strip():
                print("Found English (manual).")
                return {
                    "source": "captions-en-manual",
                    "language": getattr(t, "language_code", "en"),
                    "text": text,
                    "segments": fetched
                }
        except Exception:
            pass

        # 2) Try English auto-generated
        try:
            t = transcript_list.find_generated(english_variants)
            fetched = t.fetch()
            text = " ".join(_seg_text_safe(s) for s in fetched)
            if text.strip():
                print("Found English (auto).")
                return {
                    "source": "captions-en-auto",
                    "language": getattr(t, "language_code", "en"),
                    "text": text,
                    "segments": fetched
                }
        except Exception:
            pass

        # 3) Try any available transcript
        try:
            for t in transcript_list:
                fetched = t.fetch()
                text = " ".join(_seg_text_safe(s) for s in fetched)
                if text.strip():
                    lang = getattr(t, "language_code", "?")
                    print(f"Found transcript in {lang}.")
                    return {
                        "source": f"captions-{lang}",
                        "language": lang,
                        "text": text,
                        "segments": fetched
                    }
        except Exception:
            pass

    except Exception as e:
        print(f"list transcripts failed: {e}")

    # nothing usable
    return None

# ------------------ yt-dlp download ------------------
def download_audio_yt_dlp(url: str, target_dir: str) -> str:
    out_template = os.path.join(target_dir, "ytdl_audio.%(ext)s")
    cmd = ["yt-dlp", "--no-playlist", "-f", "bestaudio", "-o", out_template, url]
    subprocess.run(cmd, check=True)
    files = list(Path(target_dir).glob("ytdl_audio.*"))
    if not files:
        raise FileNotFoundError("yt-dlp produced no audio")
    return str(files[0])

# ------------------ ffmpeg convert ------------------
def convert_to_wav(input_path: str, output_path: str, sample_rate: int = 16000):
    cmd = ["ffmpeg", "-y", "-i", input_path, "-ar", str(sample_rate), "-ac", "1", "-vn", output_path]
    subprocess.run(cmd, check=True)

# ------------------ faster-whisper init + transcribe ------------------
def choose_compute_type_and_init(model_name: str, device: str):
    from faster_whisper import WhisperModel
    tried = []
    for compute in ("float16", "int8_float16", "int8", "float32"):
        try:
            model = WhisperModel(model_name, device=device, compute_type=compute)
            return model, compute
        except Exception as e:
            tried.append((compute, str(e)))
    raise RuntimeError(f"No supported compute types on device {device}. Tried: {tried}")

def init_model_try_devices(model_name: str, preferred_devices=("mps", "cpu")) -> Tuple[object,str,str]:
    for device in preferred_devices:
        try:
            model, compute = choose_compute_type_and_init(model_name, device)
            return model, device, compute
        except Exception:
            continue
    raise RuntimeError("No supported device found")

def transcribe_with_whisper(wav_path: str, model_name: str = "small"):
    from faster_whisper import WhisperModel  # ensure import
    model, device, compute = init_model_try_devices(model_name, preferred_devices=("mps","cpu"))
    segments, info = model.transcribe(wav_path, task="translate")
    # join text supporting either object-like or dict-like segments
    text_parts = []
    for s in segments:
        if isinstance(s, dict):
            text_parts.append(s.get("text", ""))
        else:
            text_parts.append(getattr(s, "text", "") or str(s))
    text = "".join(text_parts)
    return {"source":"whisper", "text": text, "segments": segments, "device": device, "compute_type": compute}

# ------------------ API endpoint ------------------
@app.route("/transcribe", methods=["POST"])
def transcribe_endpoint():
    payload = request.get_json(force=True)
    if not payload or "url" not in payload:
        return jsonify({"status":"error","error":"Missing 'url' in JSON body"}), 400

    url = payload["url"]
    model = payload.get("model", "small")
    keep_audio = bool(payload.get("keep_audio", False))
    video_id = get_video_id(url)

    # 1) try captions (this function is now hard-coded to attempt translations server-side)
    captions = try_youtube_captions(video_id)
    if captions:
        # return captions; include translated_from if present
        resp = {
            "status":"ok",
            "source": captions.get("source"),
            "language": captions.get("language"),
            "device": "-",
            "compute_type": "-",
            "text": captions.get("text")
        }
        if "translated_from" in captions:
            resp["translated_from"] = captions["translated_from"]
        return jsonify(resp), 200
    
    # 2) fallback: download audio + transcribe
    with tempfile.TemporaryDirectory() as tmpdir:
        try:
            audio_file = download_audio_yt_dlp(url, tmpdir)
            wav_path = os.path.join(tmpdir, "audio_16k_mono.wav")
            convert_to_wav(audio_file, wav_path)
            result = transcribe_with_whisper(wav_path, model_name=model)
            # optionally persist audio
            if keep_audio:
                dest = os.path.join(os.getcwd(), os.path.basename(audio_file))
                try:
                    os.replace(audio_file, dest)
                except Exception:
                    pass
            return jsonify({
                "status":"ok",
                "source": result.get("source"),
                "language": "en",  # whisper translate -> english
                "device": result.get("device"),
                "compute_type": result.get("compute_type"),
                "text": result.get("text")
            }), 200
        except subprocess.CalledProcessError as e:
            return jsonify({"status":"error","error":"yt-dlp or ffmpeg failed: "+str(e)}), 500
        except Exception as e:
            return jsonify({"status":"error","error": str(e)}), 500

# ------------------ run ------------------
if __name__ == "__main__":
    # in dev: set FLASK_ENV=development to get auto-reload / debug
    app.run(host="0.0.0.0", port=5001)
