---
title: "Zephyr RTOS + GCC Hardening: What's Actually Available"
date: 2025-05-01
description: "Documenting which GCC hardening flags are available on arm-zephyr-eabi-gcc SDK 0.17.0 and which are exposed through Zephyr Kconfig."
category: research-writeups
tags: [Embedded Security, GCC, Zephyr RTOS, Binary Hardening, CERIAS]
---

# Zephyr RTOS + GCC Hardening: What's Actually Available

This is a placeholder research writeup. Replace with your actual research notes.

## Background

Part of the CERIAS binary hardening research is enumerating which GCC hardening flags are actually available on the target toolchain: `arm-zephyr-eabi-gcc` from Zephyr SDK 0.17.0.

## Methodology

For each hardening flag, I:
1. Attempted to compile a minimal test program with the flag enabled
2. Checked the compiler output for errors or warnings
3. Inspected the generated assembly to confirm the mechanism was injected

## Results

| Flag | Available | Notes |
|------|-----------|-------|
| `-fstack-protector` | ✓ | Full family available |
| `-fstack-protector-strong` | ✓ | Preferred option |
| `-fstack-protector-all` | ✓ | Maximum coverage |
| `FORTIFY_SOURCE` | ✓ | Available at levels 1 and 2 |
| `-fPIE` | ✓ | Position-independent executables |
| `-fsanitize=address` | ✗ | Not supported on bare-metal ARM |
| `-fcf-protection` | ✗ | ARM architecture does not support CET |

## Kconfig Cross-Reference

Despite the compiler supporting `-fstack-protector-strong`, Zephyr's Kconfig exposes zero stack protector variants.[^kconfig] This means enabling the flag requires manual CMake modification.

[^kconfig]: Confirmed against Zephyr SDK 0.17.0. Future SDK releases may expose these via `CONFIG_STACK_SENTINEL` or similar — worth rechecking on upgrade.

## Key Finding

The `FUNC_NO_STACK_PROTECTOR` macro in `gcc.h` reveals that Zephyr was *designed* assuming global stack canary enablement — functions that cannot tolerate the overhead explicitly opt out rather than opting in.[^macro]

[^macro]: See `include/zephyr/toolchain/gcc.h` in the Zephyr source tree. The macro disables the canary for ISR entry stubs where the extra frame overhead breaks the ABI contract.
