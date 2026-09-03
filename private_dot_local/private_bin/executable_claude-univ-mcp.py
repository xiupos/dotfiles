#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["mcp"]
# ///
"""MCP server that exposes a second `claude` account (CLAUDE_CONFIG_DIR=~/.claude-univ)
as a callable subagent tool, the same way `codex mcp` exposes Codex.

Register once:
    claude mcp add --scope user claude-univ -- ~/.local/bin/claude-univ-mcp.py

Then call it like any other MCP tool (mcp__claude-univ__run_task).
"""
import json
import os
import subprocess

from mcp.server.mcpserver import MCPServer

CONFIG_DIR = os.path.expanduser("~/.claude-univ")

mcp = MCPServer("claude-univ")


@mcp.tool()
def run_task(
    prompt: str,
    cwd: str = ".",
    permission_mode: str = "default",
    model: str = "",
) -> str:
    """Delegate a task to the university-account Claude Code instance (separate Team plan/quota).

    Runs non-interactively (headless) under CLAUDE_CONFIG_DIR=~/.claude-univ, so it does not
    consume this session's usage. Good for offloading self-contained research/coding subtasks.

    Args:
        prompt: The task/instructions for the subagent to perform.
        cwd: Working directory for the subagent (defaults to current directory).
        permission_mode: One of "default", "acceptEdits", "bypassPermissions", "plan".
            "default" will refuse tools that need interactive approval (no TTY here),
            so prefer "acceptEdits" for file-editing tasks you trust, or "bypassPermissions"
            only for fully trusted, sandboxed work.
        model: Optional model override (e.g. "sonnet", "opus"). Empty = account default.
    """
    env = dict(os.environ)
    env["CLAUDE_CONFIG_DIR"] = CONFIG_DIR

    cmd = ["claude", "-p", prompt, "--output-format", "json", "--permission-mode", permission_mode]
    if model:
        cmd += ["--model", model]

    result = subprocess.run(
        cmd,
        cwd=os.path.expanduser(cwd),
        env=env,
        capture_output=True,
        text=True,
        timeout=1800,
    )

    if result.returncode != 0:
        return f"[error] claude-univ exited {result.returncode}\nstderr: {result.stderr[-4000:]}"

    try:
        data = json.loads(result.stdout)
    except json.JSONDecodeError:
        return result.stdout[-8000:]

    if data.get("is_error"):
        return f"[error] {data.get('result', data)}"

    cost = data.get("total_cost_usd")
    text = data.get("result", "")
    if cost is not None:
        text += f"\n\n(claude-univ cost: ${cost:.4f})"
    return text


if __name__ == "__main__":
    mcp.run()
