#!/usr/bin/env python3
"""
inspect_transcripts.py
Prints all transcript tracks YouTube currently exposes for a video,
including language code, whether it's generated (auto) or manual,
and lets you attempt to fetch any of them.
"""
import sys
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound

def get_video_id(url_or_id: str) -> str:
    if "v=" in url_or_id:
        return url_or_id.split("v=")[1].split("&")[0]
    elif "youtu.be/" in url_or_id:
        return url_or_id.split("youtu.be/")[1].split("?")[0]
    return url_or_id

def inspect(video_url):
    vid = get_video_id(video_url)
    try:
        tl = YouTubeTranscriptApi.list_transcripts(vid)
    except TranscriptsDisabled:
        print("Transcripts are disabled for this video.")
        return
    except NoTranscriptFound:
        print("No transcripts found (youtube-transcript-api couldn't locate any).")
        return
    except Exception as e:
        print("Error listing transcripts:", e)
        return

    print(f"Available transcript tracks for video id={vid}:")
    # transcript_list._transcripts is internal; we'll iterate using the API methods
    # We try to print manual/generated and language codes
    try:
        for t in tl:
            # the transcript object has attributes; some are internal names but usually
            # language_code and is_generated are present
            lang = getattr(t, "language_code", None)
            lang_name = getattr(t, "language", None)
            is_gen = getattr(t, "is_generated", None)
            kind = "generated" if is_gen else "manual" if is_gen is not None else "unknown"
            print(f" - language_code={lang} language={lang_name} kind={kind} object={type(t).__name__}")
    except Exception as e:
        print("Could not iterate transcript list normally:", e)
        # fallback: print repr
        print(repr(tl))

    # Try to fetch each one and show a sample
    print("\nAttempting to fetch each available track (first 3 segments preview):")
    for t in tl:
        try:
            fetched = t.fetch()
            lang = getattr(t, "language_code", None)
            is_gen = getattr(t, "is_generated", None)
            print(f"\nFetched track lang={lang} generated={is_gen}, segments={len(fetched)}. Sample:")
            for seg in fetched[:3]:
                print(f"  [{seg.get('start')}] {seg.get('text')}")
        except Exception as e:
            print("  Failed to fetch this track:", e)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python inspect_transcripts.py <YouTube URL or id>")
        sys.exit(1)
    inspect(sys.argv[1])
