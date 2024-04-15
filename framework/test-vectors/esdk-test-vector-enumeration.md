[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# ESDK Test Vector Enumeration 

This document performs the [test vector enumeration](test-vector-enumeration.md) process for the ESDK
to construct the full suite of test vectors
for the ESDK.

The full suite of test vectors can be constructed
by [enumerating all input configurations](test-vector-enumeration.md#enumerating-input-configurations) from this spec's input dimensions
and [evaluating each configuration's expected result](test-vector-enumeration.md#determining-expected-results) from this spec's evaluation rules.

## Input dimensions

- Every [MPL input dimension](mpl-test-vector-enumeration.md#input-dimensions) is an input dimension for ESDK.
- plaintext: Range of [representative plaintext values](#representative-plaintext-constraints)

## Evaluation rules

- Every [MPL evaluation rule](mpl-test-vector-enumeration.md#evaluation-rules) is an evaluation rule for ESDK.

# TODO MOVEME: representative values

## Representative plaintext constraints

* Empty: length = 0
* Small: all plaintexts where (1 < length ≤ 10)
* Medium: all plaintexts where (10 < length ≤ 1000)
* Large: all plaintexts where (1000 < length ≤ 2^32-1)
* Largest frame: all plaintexts where (length = 2^32-1)
* Largest frame + partial frame: all plaintexts where (length = 2^32-1 + [1 .. 2^32-1))
* Two largest frames: all plaintexts where (length = 2*(2^32-1))
* Many frames: all plaintexts where (length = 2*(2^32-1) + [1 .. (2^32-1)*(2^32-3)])

## Concrete representative plaintext values

(Should these even go in the spec?)

* Empty: ""
* Small: "abc"
* Medium: "abcdefg12345678910"
TODO
