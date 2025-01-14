[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Required Encryption Context CMM Vectors

## Version

1.0.0

## Summary

This describes the test cases for the [Required Encryption Context CMM](../../required-encryption-context-cmm.md)

## Reference-level Explanation

### Basic tests

A test MUST verify that on both encrypt and decrypt the correct
plaintext data key is produced.

A test MUST verify that an encrypt keyring that returns
an incorrect plaintext data key will fail.

A test MUST verify that a decrypt keyring that returns
an incorrect plaintext data key will fail.

### Required Encryption Context CMM failures on encrypt

For a given [encryption context](../../structures.md#encryption-context),
every subset of the keys for this encryption context
MUST be attempted as the `requiredEncryptionContextKeys`.
If any of the `requiredEncryptionContextKeys` do not exist in the
supplied encryption context, then the test MUST fail.

For example:

- Given an `encryptionContext`: `{a:a, b:b, c:c}` will produce the subset
  of `requiredEncryptionContextKeys`, `{{}, {a}, {b}, {c}, {a,b}, {a,c), {b,c}, {a,b,c}}`
- Given a `requiredEncryptionContextKeys` consisting of `{a}` the encryption context MUST
  have the key `{a}`.
- Given a `requiredEncryptionContextKeys` consisting of `{a,b}` the encryption context MUST
  have the keys `{a,b}`.
- Given a `requiredEncryptionContextKeys` consisting of `{a,b,c}` the encryption context MUST
  have the keys `{a,b,c}`.

If there is no `requiredEncryptionContextKeys`, then the test MUST fail.

### Required Encryption Context CMM failures on decrypt

For a given [encryption context](../../structures.md#encryption-context),
every subset of the keys for this encryption context
MUST be attempted as the `requiredEncryptionContextKeys`.
An incorrect encryption context
MUST be attempted that differs from the correct encryption context
by both values and keys.

For example:

- Given the encryption context `{a: a, b: b}` with
  `requiredEncryptionContextKeys` set to `{a, b}`, the test
  MUST attempt to decrypt AND fail with reproduced encryption contexts
  `{a:b, b:a}`,`{a:a}`, `{b:b}`,`{}`, and `{a:c, b:c, c:c}`

### Required Encryption Context CMM success cases

For a given [encryption context](../../structures.md#encryption-context),
every subset of the keys for this encryption context
MUST be attempted as the `requiredEncryptionContextKeys`.
For example, `{ a: a, b: b }` produces the complete set of keys subsets: `{ {}, { a }, { b }, { a, b } }` called `requiredEncryptionContextKeys`.

For every `requiredEncryptionContextKeys` produced above
`reproducedEncryptionContext` MUST be attempted
for every subset of the encryption context
whose keys fully intersect with the `requiredEncryptionContextKeys`.

For example:

- Given the encryption context `{a:a, b:b}` with the `requiredEncryptionContextKeys`
  set to `{a}`, the only success case for a message to successfully decrypt will be
  to supply the reproducedEncryptionContext `{a:a}`.

## Input dimensions and ranges

### Encrypt

- cmm: Adds a `"RequiredEncryptionContext"` allowed value
  - MUST add a `"RequiredEncryptionContext"` value to the `"cmm"` input dimension.
- required encryption context keys: Range is every [representative required encryption context key](#representative-required-encryption-context-keys)
  - MUST test the full range of representative required encryption context keys.
- reproduced encryption context: Range is every [representative reproduced encryption context](#representative-reproduced-encryption-context)
  - MUST test the full range of representative reproduced encryption context.

### Decrypt

These are the same as [Encrypt](#encrypt), but are specified separately so Duvet can link to unique lines for decrypt configuration.

- cmm: Adds a `"RequiredEncryptionContext"` allowed value
  - MUST add a `"RequiredEncryptionContext"` value to the `"cmm"` input dimension.
- required encryption context keys: Range is every [representative required encryption context key](#representative-required-encryption-context-keys)
  - MUST test the full range of representative required encryption context keys.
- reproduced encryption context: Range is every [representative reproduced encryption context](#representative-reproduced-encryption-context)
  - MUST test the full range of representative reproduced encryption context.

### Representative values

#### Representative required encryption context keys

- Every subset of keys in the provided [encryption context](../../structures.md#encryption-context)
  - MUST test every subset of keys in the provided encryption context.
- Any key NOT in the provided encryption context.
  - MUST test with some additional key that is not in the provided encryption context.

#### Representative reproduced encryption context

- Every subset of items in the provided [encryption context](../../structures.md#encryption-context)
  - MUST test every subset of items in the provided encryption context.
- Any item NOT in the provided encryption context.
  - MUST test with some additional item that is not in the provided encryption context.

## Test vector evaluation rules

- If any of the `requiredEncryptionContextKeys` do not exist in the
  supplied encryption context on encrypt
  then the test result MUST be `negative-encrypt-keyring`. [source](#required-encryption-context-cmm-failures-on-encrypt)
- If the set of keys in `reproducedEncryptionContext` on decrypt
  does not match the set of `requiredEncryptionContextKeys`,
  then the test result MUST be `negative-decrypt-keyring`. [source]
- If the the value for any key in `reproducedEncryptionContext` on decrypt
  does not match the value provided for that key on encrypt,
  then the test result MUST be `negative-decrypt-keyring`. [source](#required-encryption-context-cmm-failures-on-decrypt)
- In all other cases, the test result MUST be `positive-keyring`.
