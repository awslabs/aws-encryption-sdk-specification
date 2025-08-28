[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Commitment Policy example

Implementations of this example MUST follow the rules defined in
[Example Templates](../../../examples.md#example-templates).

## Implementations

- [NET](https://github.com/aws/aws-encryption-sdk-dafny/blob/mainline/aws-encryption-sdk-net/Examples/CommitmentPolicy.cs)

## Definitions

### Conventions used in this document

The key words
"MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT",
"SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in
[RFC 2119](https://tools.ietf.org/html/rfc2119).

## Header

```
The commitment policy is a security feature that, if set to its strictest
setting, ensures that messages are decrypted with the same data key
used to encrypt them.
Read more about Key Commitment and the commitment policy Here:
https://docs.aws.amazon.com/encryption-sdk/latest/developer-guide/concepts.html#key-commitment
```

## Summary

```
Demonstrates setting the commitment policy.
```

## Inputs

- **plaintext** :
  Plaintext to encrypt

## Steps

1. Instantiate the Material Providers and Encryption SDK

```
Instantiate the Encryption SDK
Set the EncryptionSDK's commitment policy parameter
to it's least strict setting, FORBID_ENCRYPT_ALLOW_DECRYPT
```

2. Encrypt the plaintext data.

```
Encrypt your plaintext data.
Since the CommitmentPolicy is set to Forbid Encrypt,
the Encryption SDK will encrypt the plaintext without key commitment.
```

3. Decrypt the encrypted data

4. Demonstrate that the decrypted plaintext is identical to the original plaintext.

5. Demonstrate that an EncryptionSDK that enforces Key Commitment on Decryption
   will fail to decrypt the encrypted message (as it was encrypted without Key Commitment).

```
Repeat the earlier decryption steps, proving that they fail
```

6. Demonstrate that the EncryptionSDK will not allow the commitment policy
   and the Algorithm Suite to be in conflict.

```
Now, the `encryptionSDK` is configured to Require Key Commitment
on both Encrypt and Decrypt (this was set on lines 100 - 105).
If we try and Encrypt data with an Algorithm that does not support Commitment:

The encryption will fail.
```
