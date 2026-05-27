---
title: "URGENT/11: Mapping GCC Hardening Flags to VxWorks Zero-Days"
date: 2026-05-27
description: "Mapping compiler-level binary hardening flags to the URGENT/11 VxWorks zero-days and where they could have raised the cost of exploitation."
category: research-writeups
tags: [ICS, Embedded Security, CERIAS, Binary Hardening, GCC, VxWorks]
---

# URGENT/11: Mapping GCC Hardening Flags to VxWorks Zero-Days

VxWorks is a popular real-time operating system (RTOS) developed by Wind River Systems. It is characterized by its high reliability, which makes it a popular choice for mission-critical systems in aerospace and defense, medical devices, industrial automation, and the automotive industry. With this in mind, any vulnerability to this RTOS could have serious consequences for the affected industries.

In 2019, this fear was actualized with the discovery of not just one vulnerability, but 11 of them on the VxWorks IPnet stack, and any connected device that utilized this stack was affected by at least one of the eleven. According to Armis Labs, "A compromised industrial controller could shut down a factory, and a pwned patient monitor could have a life-threatening effect." URGENT/11 was a serious wakeup call for the vulnerabilities in this specific stack, yet a general mindfulness for embedded security can be applied broadly to this event.

The CERIAS research on embedded binary hardening I am conducting this summer revolves directly around an ontology of compiler-level hardening flags that I gathered while parsing through the Zephyr RTOS and its documentation. The making of this ontology involved many hours spent classifying and understanding each of these flags. One of the projects I worked on throughout the beginning of the summer was a GitHub repository of every flag programmatically represented in C code — a tool to build understanding and avoid getting lost in the high-level abstractions of the work.

My first thought when exploring URGENT/11 was to examine whether any of the flags I classified could have helped secure Wind River's vulnerabilities, or raised the cost of exploitation for each. Below, I went through each of the 11 vulnerabilities outlined in the URGENT/11 report and attributed a flag which could have raised exploitation cost for any that apply. In the case where none of the flags apply — such as when the vulnerability was caused by a protocol-level failure — I left it at an explanation.

To clarify, out of the 11 CVEs, I will only focus on the five RCE vulnerabilities since they are the class of vulnerabilities where compiler-level binary hardening is relevant. The remaining five, which stem from logical and protocol-level flaws, are outside the scope of what compiler flags can protect against.

- **CVE-2019-12256** — Stack overflow in IPv4 options parsing. `-fstack-protector-strong` would have placed a canary between the buffer and return address, turning a clean RCE into a detectable crash.
- **CVE-2019-12255** — TCP Urgent Pointer integer underflow leading to memory corruption. `-fstack-protector` and `-D_FORTIFY_SOURCE=2` add bounds awareness on the buffer operations downstream of the underflow, raising exploitation cost significantly.
- **CVE-2019-12260** — TCP Urgent Pointer state confusion leading to memory corruption. `-fstack-protector` applies here for the same reason; the corruption targets stack-resident buffers whose overwrite a canary would have detected.
- **CVE-2019-12261** — TCP Urgent Pointer off-by-one write. `-D_FORTIFY_SOURCE=2` replaces unsafe memory copy calls with bounds-checked versions, catching off-by-one writes at the point of operation rather than at function return.
- **CVE-2019-12263** — TCP Urgent Pointer race condition leading to memory corruption. `-fstack-protector` would detect the resulting buffer corruption at function return, limiting clean exploitation.

Overall, this was primarily a case of RCE as a result of stack overflow, so the diversity of options in the mapping process were limited. My conclusion based on this exercise is that every major system will have vulnerabilities — it is just a matter of how expensive you make them to exploit. Stack canaries, fortified source, and bounds-checked operations are standard flags that make exploitation of these vulnerability classes significantly more costly. As to why they were not implemented in VxWorks, that is the same problem I confront in my research question. Availability and reliability have historically taken precedence on deterministic systems where every nanosecond matters.