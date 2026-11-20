#!/usr/bin/env python3
"""自研素材口语课 · 素材生成引擎（通用脚本，不含任何具体素材内容）。

素材内容全部写在 spec 文件里（默认在 tools/specs/<LESSON>.json），本脚本只负责执行。

用法：
    python3 tools/gen_assets.py --lesson L2                    # 图片 + 音频
    python3 tools/gen_assets.py --lesson L2 --only images      # 只生成图片
    python3 tools/gen_assets.py --lesson L2 --only audio       # 只生成音频
    python3 tools/gen_assets.py --lesson L2 --provider minimax --force
    python3 tools/gen_assets.py --spec tools/specs/L2.json     # 直接指定 spec
    python3 tools/gen_assets.py --list                        # 列出可用 spec

spec 文件格式（JSON）：
{
  "lesson": "L2",
  "title": "My Favorite Things 我喜欢什么",
  "style": "flat vector illustration ...",          // 可选，图片提示词后缀
  "images": [
    {"name": "card_grapes", "prompt": "one bunch of purple grapes ...",
     "width": 1024, "height": 1024}
  ],
  "audio": [
    {"name": "word_grapes", "text": "grapes", "voice": "anna"}
  ]
}

说明：
  - 密钥从 ../.env 读取，绝不打印。
  - 已生成且非空的文件默认跳过（增量重跑）；--force 重新生成。
  - voice 取值 anna / bella，对应 FunAudioLLM/CosyVoice2-0.5B 的两个预设声线。
  - 图片 provider：minimax（默认）/ siliconflow。
"""
import argparse
import json
import math
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ENV_FILE = ROOT / ".env"
SPEC_DIR = Path(__file__).resolve().parent / "specs"
ASSET_ROOT = ROOT / "site" / "assets" / "unit1"

DEFAULT_STYLE = (
    "flat vector illustration for a children's picture book, thick clean outlines, "
    "soft pastel color palette, simple rounded shapes, cheerful and friendly, "
    "no text, no letters, no words, no numbers, no watermark, no logo, "
    "no copyrighted character, high quality, clean background"
)

TTS_MODEL = "FunAudioLLM/CosyVoice2-0.5B"
VOICES = {"anna": f"{TTS_MODEL}:anna", "bella": f"{TTS_MODEL}:bella"}

# ---------------------------------------------------------------- 通用工具


def load_env():
    if not ENV_FILE.exists():
        return
    for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip())


def post_json(url, payload, headers, timeout=600):
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", **headers},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")
        try:
            return e.code, json.loads(body)
        except json.JSONDecodeError:
            return e.code, {"raw": body[:800]}


def post_bytes(url, payload, headers, timeout=300):
    """返回原始响应字节（音频接口直接回 mp3，不是 JSON）。"""
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", **headers},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, resp.read(), resp.headers.get("Content-Type", "")
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")
        raise RuntimeError(f"请求失败 {e.code}: {body[:300]}")


def download(url, dest: Path):
    dest.parent.mkdir(parents=True, exist_ok=True)
    with urllib.request.urlopen(url, timeout=180) as r:
        data = r.read()
    if len(data) < 1024:
        raise RuntimeError(f"下载内容过小：{url}")
    dest.write_bytes(data)
    return len(data)


def ok(path: Path, force: bool) -> bool:
    return path.exists() and path.stat().st_size > 1024 and not force


# ---------------------------------------------------------------- 图片


def gen_image_siliconflow(prompt, w, h):
    key = os.environ["SILICONFLOW_API_KEY"]
    base = os.environ.get("SILICONFLOW_BASE_URL", "https://api.siliconflow.cn/v1")
    status, data = post_json(
        f"{base}/images/generations",
        {"model": "Tongyi-MAI/Z-Image-Turbo", "prompt": prompt, "size": f"{w}x{h}", "n": 1},
        {"Authorization": f"Bearer {key}"},
    )
    if status != 200:
        raise RuntimeError(f"siliconflow 生图失败 {status}: {json.dumps(data)[:300]}")
    return data["images"][0]["url"]


def gen_image_minimax(prompt, w, h):
    key = os.environ["MINIMAX_API"]
    host = os.environ.get("MINIMAX_BASE_URL", "https://api.minimax.cn")
    g = math.gcd(w, h)
    ar = f"{w // g}:{h // g}"
    area = "1K" if w * h <= 1024 * 1024 * 1.2 else "2K"
    status, data = post_json(
        f"{host}/v1/images/generations",
        {
            "model": "MiniMax-H3-Image-Highspeed",
            "prompt": prompt,
            "n": 1,
            "aspect_ratio": ar,
            "area": area,
            "output_format": "jpeg",
            "output_compression": 88,
            "response_format": "url",
            "aigc_watermark": False,
        },
        {"Authorization": f"Bearer {key}"},
    )
    if status != 200:
        raise RuntimeError(f"minimax 生图失败 {status}: {json.dumps(data)[:300]}")
    for item in data.get("data", []):
        if item.get("url"):
            return item["url"]
        if item.get("error"):
            raise RuntimeError(f"minimax 生图失败: {item['error']}")
    raise RuntimeError(f"minimax 未返回图片: {json.dumps(data)[:300]}")


# ---------------------------------------------------------------- 音频


def gen_audio_to_file(text, voice, dest: Path):
    """CosyVoice2 直接返回 mp3 字节；个别模型返回 {audio: base64}，两种都兼容。"""
    import base64

    key = os.environ["SILICONFLOW_API_KEY"]
    base = os.environ.get("SILICONFLOW_BASE_URL", "https://api.siliconflow.cn/v1")
    status, raw, ctype = post_bytes(
        f"{base}/audio/speech",
        {
            "model": TTS_MODEL,
            "voice": VOICES.get(voice, voice),
            "input": text,
            "response_format": "mp3",
            "speed": 0.95,
        },
        {"Authorization": f"Bearer {key}"},
    )
    if status != 200:
        raise RuntimeError(f"siliconflow 配音失败 {status}")
    if b'"audio"' in raw[:200] and "json" in (ctype or ""):
        data = json.loads(raw.decode("utf-8"))
        raw = base64.b64decode(data["audio"])
    if len(raw) < 1024:
        raise RuntimeError(f"音频过小（{len(raw)} 字节）：{text}")
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(raw)


# ---------------------------------------------------------------- spec


def load_spec(path: Path):
    if not path.exists():
        raise SystemExit(f"找不到 spec 文件：{path}")
    spec = json.loads(path.read_text(encoding="utf-8"))
    spec.setdefault("style", DEFAULT_STYLE)
    spec.setdefault("images", [])
    spec.setdefault("audio", [])
    return spec


def list_specs():
    for p in sorted(SPEC_DIR.glob("*.json")):
        print(f"  {p.stem:<6} {p}")


# ---------------------------------------------------------------- 主流程


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lesson", help="spec 名（默认取 tools/specs/<lesson>.json）")
    ap.add_argument("--spec", help="直接给 spec 文件路径")
    ap.add_argument("--only", choices=["images", "audio", "all"], default="all")
    ap.add_argument("--provider", choices=["siliconflow", "minimax"], default="minimax")
    ap.add_argument("--force", action="store_true", help="忽略已存在文件，全部重新生成")
    ap.add_argument("--list", action="store_true", help="列出可用 spec")
    args = ap.parse_args()

    if args.list:
        print("可用 spec：")
        list_specs()
        return 0

    spec_path = Path(args.spec) if args.spec else SPEC_DIR / f"{args.lesson or 'L1'}.json"
    spec = load_spec(spec_path)

    lesson = spec.get("lesson") or spec_path.stem
    asset_dir = ASSET_ROOT / lesson
    img_dir = asset_dir / "images"
    aud_dir = asset_dir / "audio"

    load_env()
    style = spec["style"]

    # 增量：保留上一次清单里没被本次覆盖的条目
    prev = {}
    mpath = asset_dir / "index.json"
    if mpath.exists():
        try:
            prev = json.loads(mpath.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            prev = {}
    manifest = {
        "unit": spec.get("unit", "unit1"),
        "lesson": lesson,
        "title": spec.get("title", lesson),
        "updated": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "image_provider": args.provider,
        "images": list(prev.get("images", [])),
        "audio": list(prev.get("audio", [])),
    }
    manifest["images"] = [x for x in manifest["images"] if (asset_dir / x["file"]).exists()]
    manifest["audio"] = [x for x in manifest["audio"] if (asset_dir / x["file"]).exists()]

    if args.only in ("images", "all"):
        fn = gen_image_siliconflow if args.provider == "siliconflow" else gen_image_minimax
        for item in spec["images"]:
            name = item["name"]
            w = int(item.get("width", 1024))
            h = int(item.get("height", 1024))
            ext = ".jpg" if args.provider == "minimax" else ".png"
            dest = img_dir / f"{name}{ext}"
            if ok(dest, args.force):
                print(f"  跳过 {dest.name}（已存在）")
            else:
                prompt = item["prompt"]
                if item.get("style", True):
                    prompt = f"{prompt}. {style}"
                print(f"  生图 {name} ...", flush=True)
                url = fn(prompt, w, h)
                download(url, dest)
                time.sleep(1)
            manifest["images"] = [x for x in manifest["images"] if x["name"] != name]
            manifest["images"].append(
                {"file": f"images/{dest.name}", "name": name, "size": f"{w}x{h}", "bytes": dest.stat().st_size}
            )

    if args.only in ("audio", "all"):
        for item in spec["audio"]:
            name = item["name"]
            text = item["text"]
            voice = item.get("voice", "anna")
            dest = aud_dir / f"{lesson}_{name}.mp3"
            if ok(dest, args.force):
                print(f"  跳过 {dest.name}（已存在）")
            else:
                print(f"  配音 {name} ...", flush=True)
                gen_audio_to_file(text, voice, dest)
                time.sleep(0.3)
            manifest["audio"] = [x for x in manifest["audio"] if x["name"] != name]
            manifest["audio"].append(
                {"file": f"audio/{dest.name}", "name": name, "text": text, "voice": voice, "bytes": dest.stat().st_size}
            )

    asset_dir.mkdir(parents=True, exist_ok=True)
    (asset_dir / "index.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"\n✅ 完成 {lesson}：图片 {len(manifest['images'])} 张，音频 {len(manifest['audio'])} 条")
    print(f"   清单：{asset_dir / 'index.json'}")


if __name__ == "__main__":
    sys.exit(main())
