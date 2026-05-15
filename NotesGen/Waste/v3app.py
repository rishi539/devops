#!/usr/bin/env python3
"""
Flask API: YouTube URL → Transcript text (English or original language)
-----------------------------------------------------------------------
✅ Uses YouTube captions if available (manual > auto > Hindi > translate)
✅ Uses Argos Translate (offline) for Hindi→English (optional)
✅ Falls back to Whisper (faster-whisper) for full audio transcription
✅ Logs to console and app1.log

Run:
    python3 app1.py

API Endpoint:
    POST /transcribe
    JSON body:
        {
            "url": "<youtube-url-or-id>",
            "model": "small",
            "keep_audio": false,
            "translate": true
        }

Dependencies:
    pip install flask yt-dlp faster-whisper youtube-transcript-api argostranslate
    Requires ffmpeg
    Optional: install Hindi→English Argos model:
        python -m argostranslate.install --package hi_en

Author: ChatGPT GPT-5
"""

from flask import Flask, request, jsonify
import tempfile, os, subprocess, logging
from pathlib import Path
from typing import Optional, Tuple
import argostranslate.package, argostranslate.translate

# ---------------- Logging ----------------
logging.basicConfig(
    filename="app1.log",
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger(__name__)
# ---- Ensure logs go both to console and file ----
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)
console_formatter = logging.Formatter("%(asctime)s [%(levelname)s] %(message)s")
console_handler.setFormatter(console_formatter)

file_handler = logging.FileHandler("app1.log")
file_handler.setLevel(logging.INFO)
file_handler.setFormatter(console_formatter)

# Clear any existing handlers (Flask may add its own)
root_logger = logging.getLogger()
for h in root_logger.handlers[:]:
    root_logger.removeHandler(h)
root_logger.addHandler(console_handler)
root_logger.addHandler(file_handler)
root_logger.setLevel(logging.INFO)

# Redirect both Flask and Werkzeug logs to same file
werkzeug_logger = logging.getLogger("werkzeug")
werkzeug_logger.setLevel(logging.INFO)
werkzeug_logger.addHandler(file_handler)

logger = root_logger
logger.info("✅ Logging initialized (console + file).")

app = Flask(__name__)

# ---------------- Helper: video id ----------------
def get_video_id(url_or_id: str) -> str:
    if "youtube.com" in url_or_id or "youtu.be" in url_or_id:
        if "v=" in url_or_id:
            return url_or_id.split("v=")[1].split("&")[0]
        elif "youtu.be/" in url_or_id:
            return url_or_id.split("youtu.be/")[1].split("?")[0]
    return url_or_id

# ---------------- Argos Translate (chunked) ----------------
def translate_text_chunked(text: str, src_lang="hi", dest_lang="en", chunk_size=1000) -> str:
    """
    Translate large text safely using Argos Translate (offline).
    Make sure Argos model for hi→en is installed.
    """
    if not text.strip():
        return text

    translated_chunks = []
    for i in range(0, len(text), chunk_size):
        chunk = text[i:i + chunk_size]
        try:
            translated_chunk = argostranslate.translate.translate(chunk, src_lang, dest_lang)
            translated_chunks.append(translated_chunk)
            logger.info(f"Translated Argos chunk [{i}:{i+chunk_size}] successfully.")
        except Exception as e:
            logger.warning(f"Argos translation failed for chunk [{i}:{i+chunk_size}]: {e}")
            translated_chunks.append(chunk)
    return " ".join(translated_chunks)

# ---------------- Try YouTube captions ----------------
def try_youtube_captions(video_id: str, do_translate: bool) -> Optional[dict]:
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
    except Exception as e:
        logger.error(f"youtube_transcript_api import failed: {e}")
        return None

    try:
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
    except Exception as e:
        logger.error(f"list_transcripts failed: {e}")
        return None

    # english_variants = ["en", "en-US", "en-GB", "en-IN", "en-AU"]
    english_variants = []
    hindi_variants = ["hi", "hi-IN"]

    def seg_text(seg):
        if isinstance(seg, dict):
            return seg.get("text", "")
        return getattr(seg, "text", "") or str(seg)

    def pack_transcript(t_obj, label, translated_from=None):
        try:
            fetched = t_obj.fetch()
        except Exception as e:
            logger.warning(f"fetch failed for {label}: {e}")
            return None
        text = " ".join(seg_text(s) for s in fetched)
        out = {
            "source": label,
            "language": getattr(t_obj, "language_code", "?"),
            "text": text,
            "segments": fetched
        }
        if translated_from:
            out["translated_from"] = translated_from
            out["language"] = "en"
        return out

    # --- English first ---
    for finder in [transcript_list.find_manually_created_transcript, transcript_list.find_generated_transcript]:
        try:
            t = finder(english_variants)
            r = pack_transcript(t, "captions-en")
            if r:
                logger.info("Found English captions.")
                return r
        except Exception:
            continue

    # --- Hindi + optional translation ---
    for finder in [transcript_list.find_manually_created_transcript, transcript_list.find_generated_transcript]:
        try:
            t = finder(hindi_variants)
            r = pack_transcript(t, "captions-hi")
            if r:
                if do_translate:
                    logger.info("Found Hindi captions, translating via Argos (offline).")
                    r_argos = r.copy()
                    r_argos["source"] = "captions-hi-argos-translate"
                    r_argos["translated_from"] = "hi"
                    r_argos["text"] = translate_text_chunked(r["text"], src_lang="hi", dest_lang="en")
                    r_argos["language"] = "en"
                    return r_argos
                else:
                    logger.info("Found Hindi captions (translation disabled).")
                    return r
        except Exception:
            continue

    # --- Any other captions ---
    try:
        for t in transcript_list:
            src_lang = getattr(t, "language_code", "?")
            r_orig = pack_transcript(t, f"captions-{src_lang}")
            if not r_orig:
                continue
            if do_translate and src_lang != "en":
                logger.info(f"Translating {src_lang} captions → English via Argos.")
                r_orig["translated_from"] = src_lang
                r_orig["text"] = translate_text_chunked(r_orig["text"], src_lang=src_lang, dest_lang="en")
                r_orig["language"] = "en"
                r_orig["source"] = f"captions-{src_lang}-argos-translate"
            return r_orig
    except Exception as e:
        logger.error(f"Fallback captions translate failed: {e}")

    return None

# ---------------- yt-dlp Download ----------------
def download_audio_yt_dlp(url: str, target_dir: str) -> str:
    out_template = os.path.join(target_dir, "ytdl_audio.%(ext)s")
    cmd = ["yt-dlp", "--no-playlist", "-f", "bestaudio", "-o", out_template, url]
    subprocess.run(cmd, check=True)
    files = list(Path(target_dir).glob("ytdl_audio.*"))
    if not files:
        raise FileNotFoundError("yt-dlp produced no audio")
    return str(files[0])

# ---------------- ffmpeg Conversion ----------------
def convert_to_wav(input_path: str, output_path: str, sample_rate: int = 16000):
    cmd = ["ffmpeg", "-y", "-i", input_path, "-ar", str(sample_rate), "-ac", "1", "-vn", output_path]
    subprocess.run(cmd, check=True)

# ---------------- Whisper Transcription ----------------
def choose_compute_type_and_init(model_name: str, device: str):
    from faster_whisper import WhisperModel
    for compute in ("float16", "int8_float16", "int8", "float32"):
        try:
            model = WhisperModel(model_name, device=device, compute_type=compute)
            return model, compute
        except Exception:
            continue
    raise RuntimeError(f"No supported compute types on device {device}")

def init_model_try_devices(model_name: str, preferred_devices=("mps", "cpu")) -> Tuple[object, str, str]:
    for device in preferred_devices:
        try:
            model, compute = choose_compute_type_and_init(model_name, device)
            return model, device, compute
        except Exception:
            continue
    raise RuntimeError("No supported device found")

def transcribe_with_whisper(wav_path: str, model_name: str = "small"):
    from faster_whisper import WhisperModel
    model, device, compute = init_model_try_devices(model_name)
    segments, info = model.transcribe(wav_path, task="translate")
    text = "".join(getattr(s, "text", "") for s in segments)
    return {"source": "whisper", "text": text, "segments": segments, "device": device, "compute_type": compute}

# ---------------- API Endpoint ----------------
@app.route("/transcribe", methods=["POST"])
def transcribe_endpoint():
    payload = request.get_json(force=True)
    if not payload or "url" not in payload:
        return jsonify({"status": "error", "error": "Missing 'url' in JSON body"}), 400

    url = payload["url"]
    model = payload.get("model", "small")
    keep_audio = bool(payload.get("keep_audio", False))
    do_translate = bool(payload.get("translate", True))  # 👈 NEW option
    video_id = get_video_id(url)
    logger.info(f"Received transcription request for {url}, translate={do_translate}")

    # Try captions first
    captions = try_youtube_captions(video_id, do_translate)
    if captions:
        logger.info(f"Returning captions result from {captions.get('source')}")
        resp = {
            "status": "ok",
            "source": captions.get("source"),
            "language": captions.get("language"),
            "device": "-",
            "compute_type": "-",
            "text": captions.get("text")
        }
        if "translated_from" in captions:
            resp["translated_from"] = captions["translated_from"]
        return jsonify(resp), 200

    # Fallback to Whisper
    with tempfile.TemporaryDirectory() as tmpdir:
        try:
            audio_file = download_audio_yt_dlp(url, tmpdir)
            wav_path = os.path.join(tmpdir, "audio.wav")
            convert_to_wav(audio_file, wav_path)
            result = transcribe_with_whisper(wav_path, model_name=model)
            if keep_audio:
                dest = os.path.join(os.getcwd(), os.path.basename(audio_file))
                os.replace(audio_file, dest)
            return jsonify({
                "status": "ok",
                "source": result["source"],
                "language": "en",
                "device": result["device"],
                "compute_type": result["compute_type"],
                "text": result["text"]
            }), 200
        except subprocess.CalledProcessError as e:
            logger.error(f"yt-dlp or ffmpeg failed: {e}")
            return jsonify({"status": "error", "error": f"yt-dlp or ffmpeg failed: {e}"}), 500
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            return jsonify({"status": "error", "error": str(e)}), 500

# ---------------- Main ----------------
if __name__ == "__main__":
    logger.info("Starting Flask transcription API on port 5001...")
    app.run(host="0.0.0.0", port=5001)
