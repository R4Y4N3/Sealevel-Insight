.globl entrypoint
.type entrypoint,@function
entrypoint:
    mov64 r1, r10
    call helper
    exit

.type helper,@function
helper:
    syscall sol_try_find_program_address
    syscall sol_invoke_signed_c
    exit
