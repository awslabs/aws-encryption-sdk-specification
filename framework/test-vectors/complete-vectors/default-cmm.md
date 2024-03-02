[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Default CMM Vectors

## Version

1.0.0

## Summary

This describes the test cases for the [Default CMM](../../default-cmm.md)

## Reference-level Explanation

### Basic tests

A test MUST verify that on both encrypt and decrypt the correct 
plaintext data key is produced.

A test MUST verify that an encrypt keyring that returns
an incorrect plaintext data key will fail.

A test MUST verify that a decrypt keyring that returns
an incorrect plaintext data key will fail.


### Required and reproduced encryption context success cases

For a given [encryption context](../../structures.md#encryption-context),
every subset of the keys for this encryption context
MUST be attempted as the `requiredEncryptionContextKeys`.
For example, `{ a: a, b: b }` produces the complete set of keys subsets: `{ {}, { a }, { b }, { a, b } }` called `requiredEncryptionContextKeys`.

For every `requiredEncryptionContextKeys` produced above
`reproducedEncryptionContext` MUST be attempted
for every subset of the encryption context
who's keys fully intersect with the `requiredEncryptionContextKeys`.

For example:
- Given an empty `requiredEncryptionContextKeys`,
every combination of the original encryption context
will succeed as `reproducedEncryptionContext`.
- Given a `requiredEncryptionContextKeys` consisting of `{a}` the
`reproducedEncryptionContext` to try would be:
    - `{ a : a }` and `{ a : a, b : b}` 

### Required encryption context keys failures on encrypt

For a given [encryption context](../../structures.md#encryption-context),
every subset of the keys for this encryption context
MUST be attempted as the `requiredEncryptionContextKeys`.
The keys of the encryption context attempted however
MUST NOT fully intersect with the `requiredEncryptionContextKeys`.

For example:
- Given an `encryptionContext`: `{a:a, b:b, c:c}` will produce the subset 
of `requiredEncryptionContextKeys`,  `{{}, {a}, {b}, {c}, {a,b}, {a,c), {b,c}, {a,b,c}}`
- Given a `requiredEncryptionContextKeys` consisting of `{a}` the 
`reproducedEncryptionContext` to try would be:
 - `{b:b, c:c}`
- Given a `requiredEncryptionContextKeys` consisting of `{a,b}` the 
`reproducedEncryptionContext` to try would be:
 - `{}`, `{c:c}`, and `{a:a, c:c}`
- Given a `requiredEncryptionContextKeys` consisting of `{a,b,c}` the 
`reproducedEncryptionContext` to try would be:
 - `{}`

### Reproduced encryption context failures on decrypt

For a given [encryption context](../../structures.md#encryption-context),
every subset of the keys for this encryption context
MUST be attempted as the `requiredEncryptionContextKeys`.
An incorrect encryption context
MUST be attempted that differs from the correct encryption context
by both values and keys.

For example given the encryption context `{ a: a, b: b }`,
all possible combinations that are not empty of `{ a: c, b: c, c: c}`.
The test MUST attempt the union of every incorrect encryption context
with every subset of the original encryption context.
