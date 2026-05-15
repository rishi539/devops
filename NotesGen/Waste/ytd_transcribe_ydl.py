#!/usr/bin/env python3
"""
ytd_transcribe_ydl.py

Usage:
    python ytd_transcribe_ydl.py "YOUTUBE_URL" --model small --out my_transcript.txt

Behavior:
 - Try to fetch YouTube captions first (very fast) using youtube-transcript-api:
   Prefer English (manual), English (auto), Hindi (manual), Hindi (auto).
   If any found, save them as-is (do not translate).
 - If captions unavailable, download audio with yt-dlp, convert with ffmpeg,
   and transcribe+translate with faster-whisper (tries mps then cpu, with multiple compute types).
"""

import argparse
import os
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Tuple, Optional

# ------------------ Helpers: URL / ID ------------------
def get_video_id(url_or_id: str) -> str:
    if "youtube.com" in url_or_id or "youtu.be" in url_or_id:
        if "v=" in url_or_id:
            return url_or_id.split("v=")[1].split("&")[0]
        elif "youtu.be/" in url_or_id:
            return url_or_id.split("youtu.be/")[1].split("?")[0]
    return url_or_id

# ------------------ Try captions first (improved) ------------------
def try_youtube_captions(video_id: str) -> Optional[dict]:
    """
    Robust caption lookup that handles both dict-segments and object-segments returned
    by different youtube_transcript_api methods.
    Returns dict {source, language, text, segments} or None.
    """
    try:
        from youtube_transcript_api import YouTubeTranscriptApi, NoTranscriptFound, TranscriptsDisabled
    except Exception as e:
        print("youtube-transcript-api not installed or import error:", e)
        return None

    try:
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
    except Exception as e:
        print(f"Unable to list transcripts: {e}")
        return None

    def _segment_text(seg):
        # support dict-like and object-like segments
        if isinstance(seg, dict):
            return seg.get("text", "")
        # some library versions return objects with .text attribute
        text = getattr(seg, "text", None)
        if text is not None:
            return text
        # last fallback: str()
        return str(seg)

    def _fetch_and_pack(t_obj, src_label):
        try:
            fetched = t_obj.fetch()
        except Exception as e:
            print(f"Failed to fetch transcript from object: {e}")
            return None
        text = " ".join(_segment_text(s) for s in fetched)
        return {"source": src_label, "language": getattr(t_obj, "language_code", "?"), "text": text, "segments": fetched}

    # 1) English manual
    try:
        t = transcript_list.find_manually_created_transcript(['en'])
        r = _fetch_and_pack(t, "captions-en-manual")
        if r:
            print("✅ Found English (manual) captions — using them directly.")
            return r
    except Exception:
        pass

    # 2) English generated (auto)
    try:
        t = transcript_list.find_generated_transcript(['en'])
        r = _fetch_and_pack(t, "captions-en-auto")
        if r:
            print("✅ Found English (auto-generated) captions — using them directly.")
            return r
    except Exception:
        pass

    # 3) Hindi manual
    try:
        t = transcript_list.find_manually_created_transcript(['hi'])
        r = _fetch_and_pack(t, "captions-hi-manual")
        if r:
            print("✅ Found Hindi (manual) captions — using them directly.")
            return r
    except Exception:
        pass

    # 4) Hindi generated (auto)
    try:
        t = transcript_list.find_generated_transcript(['hi'])
        r = _fetch_and_pack(t, "captions-hi-auto")
        if r:
            print("✅ Found Hindi (auto-generated) captions — using them directly.")
            return r
    except Exception:
        pass

    # 5) Last resort: try any available transcript and (optionally) translate
    try:
        # pick first available transcript object from transcript_list iterator
        for t in transcript_list:
            # try fetching it directly
            r = _fetch_and_pack(t, f"captions-{getattr(t,'language_code','?')}-fetched")
            if r:
                print(f"✅ Found transcript track ({r['source']}) — using it.")
                return r
    except Exception:
        pass

    print("No English/Hindi captions (manual/auto) found.")
    return None

# ------------------ Download audio using yt-dlp ------------------
def download_audio_yt_dlp(url: str, target_dir: str) -> str:
    out_template = os.path.join(target_dir, "ytdl_audio.%(ext)s")
    cmd = [
        "yt-dlp",
        "--no-playlist",
        "-f", "bestaudio",
        "-o", out_template,
        url
    ]
    subprocess.run(cmd, check=True)
    files = list(Path(target_dir).glob("ytdl_audio.*"))
    if not files:
        raise FileNotFoundError("yt-dlp did not produce an audio file.")
    return str(files[0])

# ------------------ Convert to 16k mono wav with ffmpeg ------------------
def convert_to_wav(input_path: str, output_path: str, sample_rate: int = 16000):
    cmd = [
        "ffmpeg", "-y",
        "-i", input_path,
        "-ar", str(sample_rate),
        "-ac", "1",
        "-vn",
        output_path
    ]
    subprocess.run(cmd, check=True)

# ------------------ faster-whisper initialization with fallbacks ------------------
def choose_compute_type_and_init(model_name: str, device: str):
    """
    Try compute types in order on the given device and return (model, compute_type).
    Order: float16 -> int8_float16 -> int8 -> float32
    """
    from faster_whisper import WhisperModel

    tried = []
    for compute in ("float16", "int8_float16", "int8", "float32"):
        try:
            print(f"Attempting init on device={device} with compute_type={compute} ...")
            model = WhisperModel(model_name, device=device, compute_type=compute)
            print(f"Initialized model on device={device} with compute_type={compute}")
            return model, compute
        except ValueError as e:
            # backend doesn't support compute type
            print(f"Compute type {compute} unsupported on device {device}: {e}")
            tried.append((compute, str(e)))
        except Exception as e:
            # other errors: OOM, download issues, etc.
            print(f"Init failed for compute_type={compute} on device={device}: {e}")
            tried.append((compute, str(e)))
            continue

    raise RuntimeError(f"Could not initialize WhisperModel on device={device}. Tried: {tried}")

def init_model_try_devices(model_name: str, preferred_devices=("mps", "cpu")) -> Tuple[object, str, str]:
    """
    Try devices in preferred_devices order; return (model, device, compute_type).
    This will attempt full initialization on the first working device.
    """
    for device in preferred_devices:
        try:
            model, compute = choose_compute_type_and_init(model_name, device)
            return model, device, compute
        except Exception as e:
            print(f"Device {device} failed: {e}")
            continue
    raise RuntimeError(f"No supported device found among: {preferred_devices}")

# ------------------ Transcription with faster-whisper ------------------
def transcribe_faster_whisper(wav_path: str, model_name: str = "small") -> dict:
    """
    Initialize model (try mps then cpu with many compute types), then transcribe with translate task.
    Returns dict {source, text, segments, device, compute_type}
    """
    from faster_whisper import WhisperModel  # imported again to ensure available

    # Initialize model on a supported device
    model, device, compute_type = init_model_try_devices(model_name, preferred_devices=("mps", "cpu"))
    print(f"Proceeding to transcribe on device={device} compute_type={compute_type} ...")
    segments, info = model.transcribe(wav_path, task="translate")
    text = "".join([s.text for s in segments])
    return {"source": "whisper", "text": text, "segments": segments, "device": device, "compute_type": compute_type}

# ------------------ Save output ------------------
def save_output(filename: str, data: dict):
    header = f"# Source: {data.get('source')} (device={data.get('device','-')}, compute={data.get('compute_type','-')})\n\n"
    text = data.get("text", "")
    with open(filename, "w", encoding="utf-8") as f:
        f.write(header)
        f.write(text)
    print(f"✅ Saved transcript to: {filename}")

# ------------------ Main ------------------
def main():
    parser = argparse.ArgumentParser(description="Smart YouTube -> English transcript (captions first, fallback to audio transcription)")
    parser.add_argument("url", help="YouTube video URL or id")
    parser.add_argument("--model", default="small", help="whisper model name: tiny, base, small, medium, large")
    parser.add_argument("--out", default=None, help="output text filename (default: transcript_<id>.txt)")
    parser.add_argument("--keep_audio", action="store_true", help="keep the downloaded audio file")
    args = parser.parse_args()

    url = args.url
    video_id = get_video_id(url)
    out_file = args.out or f"transcript_{video_id}.txt"

    print("Trying YouTube captions first (very fast)...")
    captions = try_youtube_captions(video_id)
    if captions:
        print("Captions found — saving and exiting.")
        # mark as captions source (no device/compute info)
        captions["device"] = "-"
        captions["compute_type"] = "-"
        save_output(out_file, captions)
        return

    print("No captions available — falling back to audio download + transcription.")
    with tempfile.TemporaryDirectory() as tmpdir:
        try:
            print("Downloading audio via yt-dlp...")
            audio_file = download_audio_yt_dlp(url, tmpdir)
            print("Downloaded audio:", audio_file)

            wav_path = os.path.join(tmpdir, "audio_16k_mono.wav")
            print("Converting to 16kHz mono WAV...")
            convert_to_wav(audio_file, wav_path)
            print("Converted to:", wav_path)

            print(f"Transcribing with model '{args.model}' (this may take time; model will download on first run)...")
            result = transcribe_faster_whisper(wav_path, model_name=args.model)
            # add compute/device info to result for metadata
            result["device"] = result.get("device", "-")
            result["compute_type"] = result.get("compute_type", "-")
            save_output(out_file, result)

            if args.keep_audio:
                dest = os.path.join(os.getcwd(), os.path.basename(audio_file))
                try:
                    os.replace(audio_file, dest)
                    print(f"Saved original audio to: {dest}")
                except Exception as e:
                    print("Could not move audio file out of temp dir:", e)

        except subprocess.CalledProcessError:
            print("A subprocess (yt-dlp or ffmpeg) failed. Ensure they are installed and callable from PATH.")
            raise
        except Exception as ex:
            print("Transcription failed:", ex)
            raise

if __name__ == "__main__":
    main()
