export JULIA_NUM_THREADS=auto
export JULIA_HEAP_SIZE_HINT=50%

# for Pluto.jl
alias pluto="julia -e 'import Pluto; Pluto.run(auto_reload_from_file = true)'"
