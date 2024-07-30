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
- maximum encrypted data keys: Range of [representative number of maximum encrypted data keys](#representative-number-of-maximum-encrypted-data-keys-edks)

## Evaluation rules

- Every [MPL evaluation rule](mpl-test-vector-enumeration.md#evaluation-rules) is an evaluation rule for ESDK.

## Representative values

### Representative frame sizes

- Non-framed data: `frame size = 0`
  - The representative frame size value for non-framed data
    MUST have frame size = 0.
- Small frame: `0 < frame size < 4096`
  - The representative value for a small frame
    MUST have frame size between 0 and 4096.
- Default frame: `frame size = 4096`
  - The representative value for the default frame size
    MUST have frame size = 4096.
- Large frame: `frame size > 4096`
  - The representative value for a large frame
    MUST have frame size greater than 4096.

### Representative plaintext constraints

#### Framed data

These MUST only be used if `frame size > 0`.

- Empty: `length = 0`
  - The representative plaintext value for empty framed data
    MUST have length = 0.
- Small: `0 < length < 10`
  - The representative plaintext value for small framed data
    MUST have length between 0 and 10.
  - If `frame size < 10`, omit this.
- Medium: `10 ≤ length < 1000`
  - The representative plaintext value for medium framed data
    MUST have length of at least 10 and less than 1000.
  - If `frame size < 1000`, omit this.
- Large: `1000 ≤ length <` [frame size](#representative-frame-sizes)
  - The representative plaintext value for large framed data
    MUST have length of at least 1000 and less than the configured frame size.
- Largest frame: `length = frame size`
  - The representative plaintext value for the largest frame
    MUST have length equal to the configured frame size.
- Largest frame + partial frame: `frame size < length < 2\*(frame size)`
  - The representative plaintext value for a largest frame plus partial frame
    MUST have length between the configured frame size
    and twice the configured frame size.
- Two largest frames: `length = 2\*(frame size)`
  - The representative plaintext value for two largest frames
    MUST have length equal to twice the configured frame size.
- Many frames: `2*(frame size) < length < (frame size)\*(maximum # of frames)`
  - The representative plaintext value for many frames
    MUST have length between twice the configured frame size
    and ((the configured maximum number of frames) times (the configured frame size)).
- Maximum frames: `length = (frame size)\*(maximum # of frames)`
  - The representative plaintext value for maximum frames
    MUST have length equal to the configured maximum number of frames times the configured frame size.

#### Non-framed data

These MUST only be used if `frame length = 0`.

- Empty: `length = 0`
  - The representative plaintext value for empty non-framed data
    MUST have length equal to 0.
- Small: `0 < length < 10`
  - The representative plaintext value for small non-framed data
    MUST have length between 0 and 10.
- Medium: `10 ≤ length < 1000`
  - The representative plaintext value for empty non-framed data
    MUST have length of at least 10 and less than 1000.
- Large: `1000 < length ≤ 2^32`
  - The representative plaintext value for empty non-framed data
    MUST have length of at least 1000 and less than 2^32.

### Representative number of maximum encrypted data keys (EDKs)

- No configured value
  - The representative value for no configured maxiumum number of EDKs
    MUST be some unset value
    that is interpreted as "no maximum value" by the ESDK implementation.
- Zero: `max EDKs = 0`
  - The representative value for zero maximum EDKs
    MUST have length = 0.
- One: `max EDKs = 1`
  - The representative value for one maximum EDK
    MUST have length = 1.
- Few: `1 < max EDKs < 10`
  - The representative value for few maximum EDKs
    MUST have length between 1 and 10.
- Many: `10 ≤ max EDKs`
  - The representative value for many maximum EDKs
    MUST have length of at least 10.
