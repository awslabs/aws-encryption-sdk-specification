[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Basic AWS KMS ML-KEM keyring example

Implementations of this example MUST follow the rules defined in
[Example Templates](../../../examples.md#example-templates).

## Implementations

- (To be added as implementations land.)

## Definitions

### Conventions used in this document

The key words
"MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT",
"SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in
[RFC 2119](https://tools.ietf.org/html/rfc2119).

## Header

```
# This example shows how to configure and use an AWS KMS ML-KEM keyring
# to protect data keys with a NIST-standardized post-quantum Key Encapsulation Mechanism.
#
# An ML-KEM KMS key is created in AWS KMS with ENCAPSULATE_DECAPSULATE key usage.
# The keyring's encapsulation source is configurable:
#   - KmsEncapsulation:   OnEncrypt calls AWS KMS Encapsulate.
#   - LocalEncapsulation: OnEncrypt runs ML-KEM Encapsulate locally against the
#                         ML-KEM public key (no per-message KMS call).
# Decapsulation is always performed by AWS KMS, regardless of the encapsulation source.
#
# For details, see:
#   https://github.com/awslabs/aws-encryption-sdk-specification/blob/master/framework/aws-kms/aws-kms-ml-kem-keyring.md
#
# In this example, we use the one-step encrypt and decrypt APIs.
```

## Summary

```
# Demonstrate an encrypt/decrypt cycle using an AWS KMS ML-KEM keyring.
```

## Inputs

- **AWS KMS ML-KEM key ARN** :
  The ARN of an ML-KEM KMS key with `ENCAPSULATE_DECAPSULATE` key usage.
- **ML-KEM parameter set** :
  One of `ML-KEM-512`, `ML-KEM-768`, `ML-KEM-1024`,
  matching the configured KMS key.
- **source plaintext** :
  Plaintext to encrypt.

## Steps

1. Define encryption context.

   The encryption context is bound into the wrapping key derivation
   and into the AES-GCM Additional Authenticated Data of the data key wrap.

1. Create the keyring with `KmsEncapsulation` (default).

   The encrypt path calls AWS KMS `Encapsulate` once per message.
   The decrypt path calls AWS KMS `Decapsulate` once per message.

1. Encrypt the source plaintext under the keyring, asserting that the resulting
   message decrypts back to the original plaintext with the same keyring.

1. Construct a second keyring with `LocalEncapsulation`,
   supplying the same ML-KEM public key (e.g. obtained once via
   AWS KMS `GetPublicKey`).

   The encrypt path performs ML-KEM `Encapsulate` locally,
   issuing no KMS calls and requiring no `kms:Encapsulate` permission.
   The decrypt path still calls AWS KMS `Decapsulate`.

1. Demonstrate cross-mode interoperability: a message encrypted with
   `LocalEncapsulation` decrypts with `KmsEncapsulation` (and vice versa),
   because both encapsulation sources produce a byte-identical encrypted data key.
