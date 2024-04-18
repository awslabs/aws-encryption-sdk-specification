[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# ESDK Test Vector Enumeration 

This document performs the [test vector enumeration](test-vector-enumeration.md) process for the MPL
to construct the full suite of test vectors
for the MPL.

The full suite of test vectors can be constructed
by [enumerating all input configurations](test-vector-enumeration.md#enumerating-input-configurations) from this spec's input dimensions
and [evaluating each configuration's expected result](test-vector-enumeration.md#determining-expected-results) from this spec's evaluation rules.

## Input dimensions

This section enumerates the [input dimensions](../test-vectors/test-vector-enumeration.md#input-dimensions)
for MPL test vectors:

- algorithm suite ID: Range of supported [Algorithm IDs](../algorithm-suites.md#algorithm-suite-id)
- encryption context: Range of [representative encryption context values](./complete-vectors/encryption-context.md)
- required encryption context keys: (TODO: write rule for determining a representative required EC input range; probably all possible subsets of EC?)
- reproduced encryption context: Permutations of encryption context and required encryption context keys as described in the [required encryption context CMM test vectors spec](./complete-vectors/required-encryption-context-cmm.md)
- encrypt key description: Range of all [key descriptions](./key-description.md) used to request encrypt materials
- decrypt key description: Range of all [key description](./key-description.md) used to decrypt

TODO: maxplaintextlength
TODO: filtering? like, do we need to test all pairings of encrypt/decrypt key description? Lots of failed vectors...

## Evaluation rules

TODO: Link to MPL. A lot of these will be shared across the MPL.

