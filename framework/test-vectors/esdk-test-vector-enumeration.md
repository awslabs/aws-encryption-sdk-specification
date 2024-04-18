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
- commitment policy: Range of allowed [commitment policies](../../client-apis/client.md#commitment-policy)
- frame size: Range of [representative frame sizes](#representative-frame-sizes)

## Evaluation rules

- Every [MPL evaluation rule](mpl-test-vector-enumeration.md#evaluation-rules) is an evaluation rule for ESDK.

## Representative values

### Representative frame sizes

* Non-framed data: `length = 0`
* Small frame: `0 < length < 4096`
* Default frame: `length = 4096`
* Large frame: `length > 4096`

### Representative plaintext constraints

#### Framed data 

These should ONLY be used if `frame length > 0`.

* Empty: `length = 0`
* Small: all plaintexts where (1 < length ≤ 10)
  * If `frame size < 10`, omit this.
* Medium: all plaintexts where (10 < length ≤ 1000)
  * If `frame size < 1000`, omit this.
* Large: all plaintexts where (1000 < length ≤ [frame size](#representative-frame-sizes))
* Largest frame: all plaintexts where (length = frame size)
* Largest frame + partial frame: all plaintexts where (length = frame size + [1 .. frame size))
* Two largest frames: all plaintexts where (length = 2*(frame size))
* Many frames: all plaintexts where (length = 2*(frame size) + [1 .. (frame size)*(maximum # of frames-2)])
* Maximum frames: all plaintexts where (length = (frame size)*(maximum # of frames))

#### Non-framed data 

These should ONLY be used if `frame length = 0`.

* Empty: `length = 0`
* Small: all plaintexts where (1 < length ≤ 10)
* Medium: all plaintexts where (10 < length ≤ 1000)
* Large: all plaintexts where (1000 < length ≤ 2^32)