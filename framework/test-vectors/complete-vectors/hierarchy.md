[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Aws Kms Hierarchical Keyring Vectors

## Version

1.0.0

## Summary

This describes the test cases for the [Aws Kms Hierarchical Keyring](../../aws-kms/aws-kms-hierarchical-keyring.md)

## Reference-level Explanation

### Basic tests

For a given static branch key,
a test MUST attempt to encrypt and decrypt
with every available [algorithm suite](../../algorithm-suites.md#algorithm-suite-id)

For every available algorithm suite and static branch key,
a test MUST attempt to encrypt and decrypt with every [standard encryption context](./encryption-context.md#standard-encryption-contexts).

### Input dimensions

- encrypt key description.key: range of [representative branch keys](#representative-branch-keys)
- decrypt key description.key: range of [representative branch keys](#representative-branch-keys)
- decrypt key description.logicalKeyStore:
  - "Default",
    - Represents the logical key store name on encrypt
  - "Other"
    - Represents any other logical key store name

### Representative branch keys

- `"static-branch-key-1"`
  - Any valid branch key.
- `"static-branch-key-2"`
  - Any other valid branch key
- `"branch-key-no-permissions"`
  - Any valid branch key where
    the test vector runner does not have permissions
    for the KMS key
- `"branch-key-not-in-table"`
  - Any branch key ID not in the keystore table
- `"branch-key-no-version"`
  - Any branch key without a version
- `"invalid-branch-key"`
  - Any illegally mutated invalid branch key

### Evaluation rules

- If encrypting key type is anything other than `"aws-kms-hierarchy"`
  and decrypting key type is `"aws-kms-hierarchy"`,
  the result should be `"negative-decrypt"`.
- If encrypting key type is `"aws-kms-hierarchy"`
  and decrypting key type is anything other than `"aws-kms-hierarchy"`,
  the result should be `"negative-decrypt"`.
- If the logical key store is "Other",
  the result should be `"negative-decrypt"`.
- If `"key"` is different on encrypt and decrypt,
  the result should be `"negative-decrypt"`.
  (i.e. no key specified here is interoperable with any other key.)
- If `"key"` is any of:
  - `"branch-key-no-permissions"`
  - `"branch-key-not-in-table"`
  - `"branch-key-no-version"`
  - `"invalid-branch-key"`
    (i.e. an "invalid" key with a particular invalid condition)
    on either encrypt or decrypt,
    the result should be either `"negative-encrypt"` or `"negative-decrypt"`,
    depending on whether the invalid key was specified on encrypt or decrypt.
- In all other cases, the result should be `"positive"`.
