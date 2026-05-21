import base64
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

OWNER = "FLOW-NET-PROJECTS"
REPO = "FLOW-NET"
BRANCH = "flow-net-v2"
MESSAGE = "Build FLOW-NET V2 multi-page site"
SOURCE_DIR = Path(r"C:\Users\ethan\Desktop\LC TOOLS\FLOW-NET\FLOW-NET")
FILES = ["index.html", "pricing.html", "portfolio.html", "contact.html", "style.css", "script.js"]


def gh_request(token: str, method: str, url: str, payload=None):
    data = None
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "OpenClaw",
    }
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=60) as resp:
        body = resp.read()
        return json.loads(body.decode("utf-8")) if body else None


def try_get(token: str, url: str):
    try:
        return gh_request(token, "GET", url)
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        raise


def main():
    token = sys.argv[1].strip() if len(sys.argv) > 1 else ""
    if not token:
        token = sys.stdin.read().strip()
    if not token:
        raise SystemExit("Missing token")

    repo = gh_request(token, "GET", f"https://api.github.com/repos/{OWNER}/{REPO}")
    default_branch = repo["default_branch"]

    branch_ref = try_get(token, f"https://api.github.com/repos/{OWNER}/{REPO}/git/ref/heads/{BRANCH}")
    if branch_ref is None:
        default_ref = gh_request(token, "GET", f"https://api.github.com/repos/{OWNER}/{REPO}/git/ref/heads/{default_branch}")
        gh_request(
            token,
            "POST",
            f"https://api.github.com/repos/{OWNER}/{REPO}/git/refs",
            {"ref": f"refs/heads/{BRANCH}", "sha": default_ref["object"]["sha"]},
        )

    updated = []
    for name in FILES:
        path = SOURCE_DIR / name
        content_b64 = base64.b64encode(path.read_bytes()).decode("ascii")
        contents_url = f"https://api.github.com/repos/{OWNER}/{REPO}/contents/{name}?ref={BRANCH}"
        existing = try_get(token, contents_url)
        payload = {
            "message": MESSAGE,
            "branch": BRANCH,
            "content": content_b64,
        }
        if existing and existing.get("sha"):
            payload["sha"] = existing["sha"]
        gh_request(
            token,
            "PUT",
            f"https://api.github.com/repos/{OWNER}/{REPO}/contents/{name}",
            payload,
        )
        updated.append(name)

    final_ref = gh_request(token, "GET", f"https://api.github.com/repos/{OWNER}/{REPO}/git/ref/heads/{BRANCH}")
    print(f"Published {len(updated)} files to {OWNER}/{REPO}@{BRANCH}")
    print(final_ref["object"]["sha"])


if __name__ == "__main__":
    main()
