# Print an optspec for argparse to handle cmd's options that are independent of any subcommand.
function __fish_verylup_global_optspecs
	string join \n quiet verbose h/help V/version
end

function __fish_verylup_needs_command
	# Figure out if the current invocation already has a command.
	set -l cmd (commandline -opc)
	set -e cmd[1]
	argparse -s (__fish_verylup_global_optspecs) -- $cmd 2>/dev/null
	or return
	if set -q argv[1]
		# Also print the command, so this can be used to figure out what it is.
		echo $argv[1]
		return 1
	end
	return 0
end

function __fish_verylup_using_subcommand
	set -l cmd (__fish_verylup_needs_command)
	test -z "$cmd"
	and return 1
	contains -- $cmd[1] $argv
end

complete -c verylup -n "__fish_verylup_needs_command" -l quiet -d 'No output printed to stdout'
complete -c verylup -n "__fish_verylup_needs_command" -l verbose -d 'Use verbose output'
complete -c verylup -n "__fish_verylup_needs_command" -s h -l help -d 'Print help'
complete -c verylup -n "__fish_verylup_needs_command" -s V -l version -d 'Print version'
complete -c verylup -n "__fish_verylup_needs_command" -f -a "show" -d 'Show installed toolchains'
complete -c verylup -n "__fish_verylup_needs_command" -f -a "update" -d 'Update Veryl toolchains and verylup'
complete -c verylup -n "__fish_verylup_needs_command" -f -a "install" -d 'Install or update a given toolchain'
complete -c verylup -n "__fish_verylup_needs_command" -f -a "uninstall" -d 'Uninstall a given toolchain'
complete -c verylup -n "__fish_verylup_needs_command" -f -a "default" -d 'Set a given toolchain as default'
complete -c verylup -n "__fish_verylup_needs_command" -f -a "override" -d 'Modify toolchain overrides for directories'
complete -c verylup -n "__fish_verylup_needs_command" -f -a "setup" -d 'Setup Veryl toolchain'
complete -c verylup -n "__fish_verylup_needs_command" -f -a "completion" -d 'Generate tab-completion scripts for your shell'
complete -c verylup -n "__fish_verylup_needs_command" -f -a "config" -d 'Modify verylup configuration'
complete -c verylup -n "__fish_verylup_needs_command" -f -a "help" -d 'Print this message or the help of the given subcommand(s)'
complete -c verylup -n "__fish_verylup_using_subcommand show" -l quiet -d 'No output printed to stdout'
complete -c verylup -n "__fish_verylup_using_subcommand show" -l verbose -d 'Use verbose output'
complete -c verylup -n "__fish_verylup_using_subcommand show" -s h -l help -d 'Print help'
complete -c verylup -n "__fish_verylup_using_subcommand show" -s V -l version -d 'Print version'
complete -c verylup -n "__fish_verylup_using_subcommand update" -l pkg -d 'Toolchain package path for offline installation' -r -F
complete -c verylup -n "__fish_verylup_using_subcommand update" -l quiet -d 'No output printed to stdout'
complete -c verylup -n "__fish_verylup_using_subcommand update" -l verbose -d 'Use verbose output'
complete -c verylup -n "__fish_verylup_using_subcommand update" -s h -l help -d 'Print help'
complete -c verylup -n "__fish_verylup_using_subcommand update" -s V -l version -d 'Print version'
complete -c verylup -n "__fish_verylup_using_subcommand install" -l pkg -d 'Toolchain package path for offline installation' -r -F
complete -c verylup -n "__fish_verylup_using_subcommand install" -l debug -d 'Debug build for local install'
complete -c verylup -n "__fish_verylup_using_subcommand install" -l quiet -d 'No output printed to stdout'
complete -c verylup -n "__fish_verylup_using_subcommand install" -l verbose -d 'Use verbose output'
complete -c verylup -n "__fish_verylup_using_subcommand install" -s h -l help -d 'Print help'
complete -c verylup -n "__fish_verylup_using_subcommand install" -s V -l version -d 'Print version'
complete -c verylup -n "__fish_verylup_using_subcommand uninstall" -l quiet -d 'No output printed to stdout'
complete -c verylup -n "__fish_verylup_using_subcommand uninstall" -l verbose -d 'Use verbose output'
complete -c verylup -n "__fish_verylup_using_subcommand uninstall" -s h -l help -d 'Print help'
complete -c verylup -n "__fish_verylup_using_subcommand uninstall" -s V -l version -d 'Print version'
complete -c verylup -n "__fish_verylup_using_subcommand default" -l quiet -d 'No output printed to stdout'
complete -c verylup -n "__fish_verylup_using_subcommand default" -l verbose -d 'Use verbose output'
complete -c verylup -n "__fish_verylup_using_subcommand default" -s h -l help -d 'Print help'
complete -c verylup -n "__fish_verylup_using_subcommand default" -s V -l version -d 'Print version'
complete -c verylup -n "__fish_verylup_using_subcommand override; and not __fish_seen_subcommand_from list set unset help" -l quiet -d 'No output printed to stdout'
complete -c verylup -n "__fish_verylup_using_subcommand override; and not __fish_seen_subcommand_from list set unset help" -l verbose -d 'Use verbose output'
complete -c verylup -n "__fish_verylup_using_subcommand override; and not __fish_seen_subcommand_from list set unset help" -s h -l help -d 'Print help'
complete -c verylup -n "__fish_verylup_using_subcommand override; and not __fish_seen_subcommand_from list set unset help" -s V -l version -d 'Print version'
complete -c verylup -n "__fish_verylup_using_subcommand override; and not __fish_seen_subcommand_from list set unset help" -f -a "list" -d 'List directory toolchain overrides'
complete -c verylup -n "__fish_verylup_using_subcommand override; and not __fish_seen_subcommand_from list set unset help" -f -a "set" -d 'Set the override toolchain for a directory'
complete -c verylup -n "__fish_verylup_using_subcommand override; and not __fish_seen_subcommand_from list set unset help" -f -a "unset" -d 'Remove the override toolchain for a directory'
complete -c verylup -n "__fish_verylup_using_subcommand override; and not __fish_seen_subcommand_from list set unset help" -f -a "help" -d 'Print this message or the help of the given subcommand(s)'
complete -c verylup -n "__fish_verylup_using_subcommand override; and __fish_seen_subcommand_from list" -l quiet -d 'No output printed to stdout'
complete -c verylup -n "__fish_verylup_using_subcommand override; and __fish_seen_subcommand_from list" -l verbose -d 'Use verbose output'
complete -c verylup -n "__fish_verylup_using_subcommand override; and __fish_seen_subcommand_from list" -s h -l help -d 'Print help'
complete -c verylup -n "__fish_verylup_using_subcommand override; and __fish_seen_subcommand_from list" -s V -l version -d 'Print version'
complete -c verylup -n "__fish_verylup_using_subcommand override; and __fish_seen_subcommand_from set" -l quiet -d 'No output printed to stdout'
complete -c verylup -n "__fish_verylup_using_subcommand override; and __fish_seen_subcommand_from set" -l verbose -d 'Use verbose output'
complete -c verylup -n "__fish_verylup_using_subcommand override; and __fish_seen_subcommand_from set" -s h -l help -d 'Print help'
complete -c verylup -n "__fish_verylup_using_subcommand override; and __fish_seen_subcommand_from set" -s V -l version -d 'Print version'
complete -c verylup -n "__fish_verylup_using_subcommand override; and __fish_seen_subcommand_from unset" -l quiet -d 'No output printed to stdout'
complete -c verylup -n "__fish_verylup_using_subcommand override; and __fish_seen_subcommand_from unset" -l verbose -d 'Use verbose output'
complete -c verylup -n "__fish_verylup_using_subcommand override; and __fish_seen_subcommand_from unset" -s h -l help -d 'Print help'
complete -c verylup -n "__fish_verylup_using_subcommand override; and __fish_seen_subcommand_from unset" -s V -l version -d 'Print version'
complete -c verylup -n "__fish_verylup_using_subcommand override; and __fish_seen_subcommand_from help" -f -a "list" -d 'List directory toolchain overrides'
complete -c verylup -n "__fish_verylup_using_subcommand override; and __fish_seen_subcommand_from help" -f -a "set" -d 'Set the override toolchain for a directory'
complete -c verylup -n "__fish_verylup_using_subcommand override; and __fish_seen_subcommand_from help" -f -a "unset" -d 'Remove the override toolchain for a directory'
complete -c verylup -n "__fish_verylup_using_subcommand override; and __fish_seen_subcommand_from help" -f -a "help" -d 'Print this message or the help of the given subcommand(s)'
complete -c verylup -n "__fish_verylup_using_subcommand setup" -l pkg -d 'Toolchain package path for offline installation' -r -F
complete -c verylup -n "__fish_verylup_using_subcommand setup" -l toolchain -d 'Specify a toolchain to install at setup' -r
complete -c verylup -n "__fish_verylup_using_subcommand setup" -l offline -d 'Offline mode'
complete -c verylup -n "__fish_verylup_using_subcommand setup" -l no-self-update -d 'Disable self-update'
complete -c verylup -n "__fish_verylup_using_subcommand setup" -l quiet -d 'No output printed to stdout'
complete -c verylup -n "__fish_verylup_using_subcommand setup" -l verbose -d 'Use verbose output'
complete -c verylup -n "__fish_verylup_using_subcommand setup" -s h -l help -d 'Print help'
complete -c verylup -n "__fish_verylup_using_subcommand setup" -s V -l version -d 'Print version'
complete -c verylup -n "__fish_verylup_using_subcommand completion" -l quiet -d 'No output printed to stdout'
complete -c verylup -n "__fish_verylup_using_subcommand completion" -l verbose -d 'Use verbose output'
complete -c verylup -n "__fish_verylup_using_subcommand completion" -s h -l help -d 'Print help'
complete -c verylup -n "__fish_verylup_using_subcommand completion" -s V -l version -d 'Print version'
complete -c verylup -n "__fish_verylup_using_subcommand config; and not __fish_seen_subcommand_from show set unset help" -l quiet -d 'No output printed to stdout'
complete -c verylup -n "__fish_verylup_using_subcommand config; and not __fish_seen_subcommand_from show set unset help" -l verbose -d 'Use verbose output'
complete -c verylup -n "__fish_verylup_using_subcommand config; and not __fish_seen_subcommand_from show set unset help" -s h -l help -d 'Print help'
complete -c verylup -n "__fish_verylup_using_subcommand config; and not __fish_seen_subcommand_from show set unset help" -s V -l version -d 'Print version'
complete -c verylup -n "__fish_verylup_using_subcommand config; and not __fish_seen_subcommand_from show set unset help" -f -a "show" -d 'Show the current configuration'
complete -c verylup -n "__fish_verylup_using_subcommand config; and not __fish_seen_subcommand_from show set unset help" -f -a "set" -d 'Modify an entry of the configuration'
complete -c verylup -n "__fish_verylup_using_subcommand config; and not __fish_seen_subcommand_from show set unset help" -f -a "unset" -d 'Remove an entry of the configuration'
complete -c verylup -n "__fish_verylup_using_subcommand config; and not __fish_seen_subcommand_from show set unset help" -f -a "help" -d 'Print this message or the help of the given subcommand(s)'
complete -c verylup -n "__fish_verylup_using_subcommand config; and __fish_seen_subcommand_from show" -l quiet -d 'No output printed to stdout'
complete -c verylup -n "__fish_verylup_using_subcommand config; and __fish_seen_subcommand_from show" -l verbose -d 'Use verbose output'
complete -c verylup -n "__fish_verylup_using_subcommand config; and __fish_seen_subcommand_from show" -s h -l help -d 'Print help'
complete -c verylup -n "__fish_verylup_using_subcommand config; and __fish_seen_subcommand_from show" -s V -l version -d 'Print version'
complete -c verylup -n "__fish_verylup_using_subcommand config; and __fish_seen_subcommand_from set" -l quiet -d 'No output printed to stdout'
complete -c verylup -n "__fish_verylup_using_subcommand config; and __fish_seen_subcommand_from set" -l verbose -d 'Use verbose output'
complete -c verylup -n "__fish_verylup_using_subcommand config; and __fish_seen_subcommand_from set" -s h -l help -d 'Print help'
complete -c verylup -n "__fish_verylup_using_subcommand config; and __fish_seen_subcommand_from set" -s V -l version -d 'Print version'
complete -c verylup -n "__fish_verylup_using_subcommand config; and __fish_seen_subcommand_from unset" -l quiet -d 'No output printed to stdout'
complete -c verylup -n "__fish_verylup_using_subcommand config; and __fish_seen_subcommand_from unset" -l verbose -d 'Use verbose output'
complete -c verylup -n "__fish_verylup_using_subcommand config; and __fish_seen_subcommand_from unset" -s h -l help -d 'Print help'
complete -c verylup -n "__fish_verylup_using_subcommand config; and __fish_seen_subcommand_from unset" -s V -l version -d 'Print version'
complete -c verylup -n "__fish_verylup_using_subcommand config; and __fish_seen_subcommand_from help" -f -a "show" -d 'Show the current configuration'
complete -c verylup -n "__fish_verylup_using_subcommand config; and __fish_seen_subcommand_from help" -f -a "set" -d 'Modify an entry of the configuration'
complete -c verylup -n "__fish_verylup_using_subcommand config; and __fish_seen_subcommand_from help" -f -a "unset" -d 'Remove an entry of the configuration'
complete -c verylup -n "__fish_verylup_using_subcommand config; and __fish_seen_subcommand_from help" -f -a "help" -d 'Print this message or the help of the given subcommand(s)'
complete -c verylup -n "__fish_verylup_using_subcommand help; and not __fish_seen_subcommand_from show update install uninstall default override setup completion config help" -f -a "show" -d 'Show installed toolchains'
complete -c verylup -n "__fish_verylup_using_subcommand help; and not __fish_seen_subcommand_from show update install uninstall default override setup completion config help" -f -a "update" -d 'Update Veryl toolchains and verylup'
complete -c verylup -n "__fish_verylup_using_subcommand help; and not __fish_seen_subcommand_from show update install uninstall default override setup completion config help" -f -a "install" -d 'Install or update a given toolchain'
complete -c verylup -n "__fish_verylup_using_subcommand help; and not __fish_seen_subcommand_from show update install uninstall default override setup completion config help" -f -a "uninstall" -d 'Uninstall a given toolchain'
complete -c verylup -n "__fish_verylup_using_subcommand help; and not __fish_seen_subcommand_from show update install uninstall default override setup completion config help" -f -a "default" -d 'Set a given toolchain as default'
complete -c verylup -n "__fish_verylup_using_subcommand help; and not __fish_seen_subcommand_from show update install uninstall default override setup completion config help" -f -a "override" -d 'Modify toolchain overrides for directories'
complete -c verylup -n "__fish_verylup_using_subcommand help; and not __fish_seen_subcommand_from show update install uninstall default override setup completion config help" -f -a "setup" -d 'Setup Veryl toolchain'
complete -c verylup -n "__fish_verylup_using_subcommand help; and not __fish_seen_subcommand_from show update install uninstall default override setup completion config help" -f -a "completion" -d 'Generate tab-completion scripts for your shell'
complete -c verylup -n "__fish_verylup_using_subcommand help; and not __fish_seen_subcommand_from show update install uninstall default override setup completion config help" -f -a "config" -d 'Modify verylup configuration'
complete -c verylup -n "__fish_verylup_using_subcommand help; and not __fish_seen_subcommand_from show update install uninstall default override setup completion config help" -f -a "help" -d 'Print this message or the help of the given subcommand(s)'
complete -c verylup -n "__fish_verylup_using_subcommand help; and __fish_seen_subcommand_from override" -f -a "list" -d 'List directory toolchain overrides'
complete -c verylup -n "__fish_verylup_using_subcommand help; and __fish_seen_subcommand_from override" -f -a "set" -d 'Set the override toolchain for a directory'
complete -c verylup -n "__fish_verylup_using_subcommand help; and __fish_seen_subcommand_from override" -f -a "unset" -d 'Remove the override toolchain for a directory'
complete -c verylup -n "__fish_verylup_using_subcommand help; and __fish_seen_subcommand_from config" -f -a "show" -d 'Show the current configuration'
complete -c verylup -n "__fish_verylup_using_subcommand help; and __fish_seen_subcommand_from config" -f -a "set" -d 'Modify an entry of the configuration'
complete -c verylup -n "__fish_verylup_using_subcommand help; and __fish_seen_subcommand_from config" -f -a "unset" -d 'Remove an entry of the configuration'
