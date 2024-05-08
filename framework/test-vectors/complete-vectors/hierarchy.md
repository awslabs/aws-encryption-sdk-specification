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

#### Encrypt

- key description
  - key: range of [representative branch keys](#representative-branch-keys)

#### Decrypt

- key description
  - key: range of [representative branch keys](#representative-branch-keys)
  - logicalKeyStore:
    - "Default",
      - Represents the logical key store name on encrypt
    - "Other"
      - Represents any other logical key store name

### Representative branch keys

- `"static-branch-key-1"`
  - MUST be some valid branch key.
- `"static-branch-key-2"`
  - MUST be some valid branch key other than `static-branch-key-1`.
- `"branch-key-no-permissions"`
  - MUST be some valid branch key where the test vector runner does not have permissions for the KMS key.
- `"branch-key-not-in-table"`
  - MUST be some branch key ID not present in the keystore table.,
- `"branch-key-no-version"`
  - MUST be some branch key that is in the table, but the configured version is not in the table.
- `"invalid-branch-key-material"`
  - MUST be some branch key with illegally mutated invalid branch key material.

### Evaluation rules

- If encrypting key type is anything other than `"aws-kms-hierarchy"`
  and decrypting key type is `"aws-kms-hierarchy"`,
  the result MUST be `"negative-decrypt"`.
- If encrypting key type is `"aws-kms-hierarchy"`
  and decrypting key type is anything other than `"aws-kms-hierarchy"`,
  the result MUST be `"negative-decrypt"`.
- If the logical key store is "Other",
  the result MUST be `"negative-decrypt"`.
- If `"key"` is different on encrypt and decrypt,
  the result MUST be `"negative-decrypt"`.
  (i.e. no key specified here is interoperable with any other key.)
- If `"key"` is any of:
  - `"branch-key-no-permissions"`
  - `"branch-key-not-in-table"`
  - `"branch-key-no-version"`
  - `"invalid-branch-key"`
    (i.e. an "invalid" key with a particular invalid condition)
    on either encrypt or decrypt,
    the result MUST be either `"negative-encrypt"` or `"negative-decrypt"`,
    depending on whether the invalid key was specified on encrypt or decrypt.
- In all other cases, the result MUST be `"positive"`.
