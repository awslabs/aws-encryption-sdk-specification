[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

## Summary

This describes the test cases for the [Default CMM](../../default-cmm.md)

## Reference-level Explanation

### Basic tests

A test MUST verify that a simple plaintext data key will succeed.

A test MUST verify that an encrypt keyring that returns
an incorrect plaintext data key will fail.

A test MUST verify that a decrypt keyring that returns
an incorrect plaintext data key will fail.

With the above tests we infer
that all other keyring tests that are wrapped by the DefaultCMM
will fail successfully if the materials returned are not valid.

Every signing algorithm suite MUST be tested
because the verification key is appended to the encryption context.

### Required and reproduced encryption context success cases

For a given encryption context,
every subset of the keys for this encryption context
MUST be attempted as the `requiredEncryptionContextKeys`.
For example given `{ a: a, b: b }` the complete set of keys subsets
would be `{ {}, { a }, { b }, { a, b } }`.
For every `requiredEncryptionContextKeys` produced above
`reproducedEncryptionContext` MUST be attempted
for every subset of the encryption context
who's keys fully intersect with the `requiredEncryptionContextKeys`.
For example given an empty `requiredEncryptionContextKeys`,
every combination of the original encryption context
will succeed as `reproducedEncryptionContext`.

### Required encryption context keys failures on encrypt

For a given encryption context,
every subset of the keys for this encryption context
MUST be attempted as the `requiredEncryptionContextKeys`.
The keys of the encryption context attempted however
MUST NOT fully intersect with the `requiredEncryptionContextKeys`.

### Reproduced encryption context failures on decrypt

For a given encryption context,
every subset of the keys for this encryption context
MUST be attempted as the `requiredEncryptionContextKeys`.
An incorrect encryption context
MUST be attempted that differs from the correct encryption context
by both values and keys.
For example given `{ a: a, b: b }` all possible combinations
that are not empty of `{ a: c, b: c, c: c}`.
The test MUST attempt the union of every incorrect encryption context
with every subset of the original encryption context.
