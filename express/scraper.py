#!/usr/bin/env python3
import sys
import os
import json
import re
from curl_cffi import requests
from parsel import Selector

# Configure standard browser headers for curl_cffi
HEADERS = {
    "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "accept-language": "en-US,en;q=0.9",
    "sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"macOS"',
    "sec-fetch-dest": "document",
    "sec-fetch-mode": "navigate",
    "sec-fetch-site": "none",
    "sec-fetch-user": "?1",
    "upgrade-insecure-requests": "1"
}

def scrape_instagram_reel(url):
    """
    Fetches the Instagram page and extracts video, thumbnail, and summary metadata
    using the exact JSON extraction path provided by the user.
    """
    # Make request using curl_cffi (impersonate chrome)
    response = requests.get(url, headers=HEADERS, impersonate="chrome")
    if response.status_code != 200:
        raise Exception(f"Instagram returned HTTP {response.status_code}")

    html = response.text
    selector = Selector(text=html)

    thumbnail_url = None
    video_url = None
    summary = None
    username = None

    # Search script tags with type application/json
    for jsons_text in selector.css('script[type="application/json"]::text').getall():
        if 'video_versions' in jsons_text:
            try:
                json_data = json.loads(jsons_text)
                
                # Navigate the exact JSON path provided by the user
                # json_data.get('require')[0][3][0].get('__bbox').get('require')[0][3][1].get('__bbox').get('result').get('data').get('xdt_api__v1__media__shortcode__web_info').get('items')[0]
                require_list = json_data.get('require', [])
                if require_list:
                    # Resolve first require level
                    first_bbox = require_list[0][3][0].get('__bbox', {})
                    # Resolve second require level
                    second_bbox = first_bbox.get('require', [])[0][3][1].get('__bbox', {})
                    # Retrieve the main media result object
                    media_result = second_bbox.get('result', {}).get('data', {}).get('xdt_api__v1__media__shortcode__web_info', {}).get('items', [])[0]
                    
                    # Extract video URL
                    video_versions = media_result.get("video_versions", [])
                    if video_versions:
                        video_url = video_versions[0].get("url")
                    
                    # Extract thumbnail URL
                    image_versions = media_result.get("image_versions2", {})
                    if image_versions:
                        candidates = image_versions.get("candidates", [])
                        if candidates:
                            thumbnail_url = candidates[0].get("url")
                            
                    # Extract caption / summary
                    caption = media_result.get("caption", {})
                    if caption:
                        summary = caption.get("text")
                        
                    # Extract username
                    user = media_result.get("user", {})
                    username = user.get("username")
                    if not username:
                        owner = media_result.get("owner", {})
                        username = owner.get("username")
                        
                    if video_url and thumbnail_url:
                        break
            except Exception as parse_err:
                # Fallback to recursive key search if the exact index changed
                try:
                    def recursive_find(obj):
                        nonlocal video_url, thumbnail_url, summary, username
                        if isinstance(obj, dict):
                            if "video_versions" in obj and not video_url:
                                video_versions = obj.get("video_versions", [])
                                if video_versions:
                                    video_url = video_versions[0].get("url")
                            if "image_versions2" in obj and not thumbnail_url:
                                candidates = obj.get("image_versions2", {}).get("candidates", [])
                                if candidates:
                                    thumbnail_url = candidates[0].get("url")
                            if "caption" in obj and not summary:
                                summary = obj.get("caption", {}).get("text")
                            if "user" in obj and not username:
                                username = obj.get("user", {}).get("username")
                            if "owner" in obj and not username:
                                username = obj.get("owner", {}).get("username")
                            if "username" in obj and not username:
                                username = obj.get("username")
                            
                            for val in obj.values():
                                recursive_find(val)
                        elif isinstance(obj, list):
                            for item in obj:
                                recursive_find(item)
                    
                    recursive_find(json_data)
                    if video_url and thumbnail_url:
                        break
                except Exception:
                    pass

    # OpenGraph fallback meta tags if JSON parsing fails
    if not thumbnail_url:
        thumbnail_url = selector.css('meta[property="og:image"]::attr(content)').get()
    if not video_url:
        video_url = selector.css('meta[property="og:video"]::attr(content)').get()
    if not summary:
        summary = selector.css('meta[property="og:title"]::attr(content)').get() or selector.css('meta[name="description"]::attr(content)').get()

    # Clean up summary and extract username from fallback if needed
    if summary:
        # Check standard og:title format: "username on Instagram: \"caption\""
        title_match = re.match(r'^([A-Za-z0-9_.]+)\s+on\s+Instagram:', summary)
        if title_match and not username:
            username = title_match.group(1)

        summary = re.sub(r'^[A-Za-z0-9_.]+\s+on\s+Instagram:\s+"?', '', summary)
        summary = re.sub(r'"\s*$', '', summary)
        summary = summary.strip()
    else:
        summary = "Instagram Reel"

    # Also search description for "(@username)" if username not found
    if not username:
        desc = selector.css('meta[name="description"]::attr(content)').get() or selector.css('meta[property="og:description"]::attr(content)').get()
        if desc:
            desc_match = re.search(r'@([A-Za-z0-9_.]+)', desc)
            if desc_match:
                username = desc_match.group(1)

    return {
        "success": True,
        "url": url,
        "thumbnail_url": thumbnail_url,
        "video_url": video_url,
        "summary": summary,
        "username": username
    }

def download_video(video_url, output_path):
    """
    Downloads the video content streaming it in chunks.
    """
    print(f"Downloading video from {video_url[:60]}... to {output_path}")
    response = requests.get(video_url, headers=HEADERS, stream=True, impersonate="chrome")
    response.raise_for_status()
    with open(output_path, "wb") as f:
        for chunk in response.iter_content(chunk_size=8192):
            if chunk:
                f.write(chunk)
    print(f"✅ Download completed: {output_path}")

def main():
    if len(sys.argv) < 2:
        print("Usage:")
        print("  Query metadata:     python scraper.py <url> --json")
        print("  Download single:    python scraper.py <url>")
        sys.exit(1)

    target = sys.argv[1]

    # JSON Query Mode
    if "--json" in sys.argv:
        try:
            result = scrape_instagram_reel(target)
            print(json.dumps(result))
        except Exception as e:
            print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(0)

    # Standalone URL File Download Mode
    if os.path.isfile(target):
        urls = []
        with open(target, "r") as f:
            urls = [line.strip() for line in f if line.strip() and not line.startswith("#")]
        
        if not urls:
            print("No URLs found in the text file.")
            sys.exit(1)

        print(f"Found {len(urls)} URLs in {target}. Starting downloads...")
        os.makedirs("downloads", exist_ok=True)
        
        for idx, url in enumerate(urls, 1):
            try:
                print(f"\n[{idx}/{len(urls)}] Processing: {url}")
                data = scrape_instagram_reel(url)
                if not data.get("video_url"):
                    print("❌ Could not extract video URL for this Reel.")
                    continue
                
                # Create a file name from the shortcode
                shortcode_match = re.search(r'/(?:p|reel)/([A-Za-z0-9_-]+)', url)
                shortcode = shortcode_match.group(1) if shortcode_match else f"reel_{idx}"
                filename = os.path.join("downloads", f"{shortcode}.mp4")
                
                download_video(data["video_url"], filename)
            except Exception as e:
                print(f"❌ Failed to download {url}: {e}")
        sys.exit(0)

    # Standalone Single URL Download Mode
    if target.startswith("http"):
        try:
            print(f"Processing Reel URL: {target}")
            data = scrape_instagram_reel(target)
            if not data.get("video_url"):
                print("❌ Could not extract video URL for this Reel.")
                sys.exit(1)
            
            os.makedirs("downloads", exist_ok=True)
            shortcode_match = re.search(r'/(?:p|reel)/([A-Za-z0-9_-]+)', target)
            shortcode = shortcode_match.group(1) if shortcode_match else "reel"
            filename = os.path.join("downloads", f"{shortcode}.mp4")
            
            download_video(data["video_url"], filename)
        except Exception as e:
            print(f"❌ Error: {e}")
            sys.exit(1)
    else:
        print(f"Invalid URL or file: {target}")
        sys.exit(1)

if __name__ == "__main__":
    main()
