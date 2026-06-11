---
title: "GCC Flag Simulations: Project Overview"
date: 2025-04-01
description: "An introduction to the gcc_flag_simulations repository — what it is, why it exists, and how it works."
category: home-labs
tags: [GCC, C, Security, Binary Hardening, Systems Programming]
series: "GCC Flag Simulations"
seriesPart: 1
---

# GCC Flag Simulations: Project Overview

This is a placeholder project writeup. Replace with your actual content.

## What Is This?

The `gcc_flag_simulations` repository is a collection of C files that manually simulate the mechanisms injected by GCC hardening flags — without actually enabling the flags.

## Why?

Understanding what GCC *actually does* when you pass `-fstack-protector-strong` requires reading the generated assembly or the GCC source. This project takes a different approach: reimplement the mechanism in plain C, with full documentation.

## Repository Structure

Each file corresponds to one hardening mechanism:

```
gcc_flag_simulations/
├── stack_protector/
│   ├── basic.c          # simulates -fstack-protector
│   └── strong.c         # simulates -fstack-protector-strong
├── fortify_source/
│   └── memcpy.c         # simulates FORTIFY_SOURCE for memcpy
└── README.md
```

## How to Use

Clone the repo and read the source files alongside the GCC documentation.

```bash
git clone https://github.com/kristianjosipuremovic/gcc_flag_simulations
```

Each file is fully commented and stands alone as documentation.
