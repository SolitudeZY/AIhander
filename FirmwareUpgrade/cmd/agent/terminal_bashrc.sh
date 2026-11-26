# Bash 4.4+ integration. Also installed as firmware-terminal-bashrc for the
# fixed unprivileged launcher. This is execution telemetry, not a security boundary.
if [[ -z ${FW_TERMINAL_ISOLATED-} && -r ~/.bashrc ]]; then source ~/.bashrc; fi
if (( BASH_VERSINFO[0] < 4 || (BASH_VERSINFO[0] == 4 && BASH_VERSINFO[1] < 4) )); then return; fi
command -v base64 >/dev/null || return

__fw_token="${BASHPID}-${RANDOM}-${RANDOM}"
__fw_previous_history=''
__fw_clock() {
    if [[ -n ${EPOCHREALTIME-} ]]; then printf '%s' "$EPOCHREALTIME";
    else command date +%s.%N; fi
}
__fw_begin() {
    local entry text='' encoded=''
    entry=$(HISTTIMEFORMAT= builtin history 1)
    # History may be disabled, ignored or deduplicated. Never reuse the previous
    # command in that case. The gateway can still associate a single submitted input.
    if [[ "$entry" != "$__fw_previous_history" && "$entry" =~ ^[[:space:]]*[0-9]+[[:space:]]+(.*)$ ]]; then
        text=${BASH_REMATCH[1]}
        if (( ${#text} <= 8192 )); then encoded=$(printf '%s' "$text" | command base64 -w0); fi
    fi
    printf '\033]777;fwcmd;%s;start;%s;%s\007' "$__fw_token" "$(__fw_clock)" "$encoded"
}
__fw_end() {
    local result=$1
    printf '\033]777;fwcmd;%s;end;%s;%s\007' "$__fw_token" "$(__fw_clock)" "$result"
    __fw_previous_history=$(HISTTIMEFORMAT= builtin history 1)
    return "$result"
}
# Capture $? before existing prompt commands; preserve their scalar/array form.
PROMPT_COMMAND=( '__fw_end "$?"' "${PROMPT_COMMAND[@]}" )
PS0='$(__fw_begin)'"${PS0-}"
printf '\033]777;fwcmd;%s;ready\007' "$__fw_token"
