[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# AWS KMS ML-KEM Keyring Vectors

## Version

1.0.0

## Summary

This describes the test cases for the
[AWS KMS ML-KEM Keyring](../../aws-kms/aws-kms-ml-kem-keyring.md).

## Reference-level Explanation

### Basic tests

A test MUST attempt every ML-KEM parameter set:
`ml-kem-512`, `ml-kem-768`, and `ml-kem-1024`.

A test MUST attempt every encapsulation source: `kms` and `local`.

A test MUST attempt to encrypt and decrypt
with every [algorithm suite](../../algorithm-suites.md#algorithm-suite-id).

A test MUST attempt every
[standard encryption context](./encryption-context.md#standard-encryption-contexts).

### Cross-mode interoperability

For each ML-KEM parameter set,
a test MUST encrypt with `encapsulation` set to `kms`
and decrypt with `encapsulation` set to `local`,
and vice versa.
Both round-trips MUST succeed,
because both encapsulation sources produce a byte-identical encrypted data key.

### Known-answer tests

A test MUST verify that the deterministic portion of the keyring's wrapping
produces byte-exact output for fixed inputs.
The deterministic portion is the
[key derivation](../../aws-kms/aws-kms-ml-kem-keyring.md#key-derivation)
and the
[data key wrap](../../aws-kms/aws-kms-ml-kem-keyring.md#data-key-wrapping);
the encapsulation step itself is non-deterministic and MUST be excluded from
known-answer tests (each known-answer test pins a fixed shared secret).

Each known-answer vector MUST pin:

- A fixed 32-byte shared secret.
- A fixed 32-byte salt.
- A fixed AWS KMS key ARN.
- A fixed plaintext data key.
- A fixed canonicalized encryption context.

And MUST assert byte equality against:

- The derived wrapping key.
- The serialized
  [`FixedInfo`](../../aws-kms/aws-kms-ml-kem-keyring.md#key-derivation).
- The serialized
  [Key Provider Information](../../aws-kms/aws-kms-ml-kem-keyring.md#key-provider-information).
- The serialized [Ciphertext](../../aws-kms/aws-kms-ml-kem-keyring.md#ciphertext)
  structure, given the fixed KEM ciphertext, salt, plaintext data key, and IV.

### Negative tests

A test MUST verify that decryption fails
when the encrypted data key's `Key ARN` does not match
the keyring's configured AWS KMS key identifier.

A test MUST verify that decryption fails
when the encrypted data key's `Version` byte does not match `0x01`.

A test MUST verify that decryption fails
when the encrypted data key's KEM ciphertext length does not match
the configured parameter set.

A test MUST verify that decryption fails
when the encryption context used on decrypt does not match the encryption context
used on encrypt
(this is detected by AES-GCM authentication failure during data key unwrap).
