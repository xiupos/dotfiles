set -Ux JULIA_NUM_THREADS auto
set -Ux JULIA_HEAP_SIZE_HINT 50%

# for Pluto.jl
alias pluto "julia -e 'import Pluto; Pluto.run()'"
