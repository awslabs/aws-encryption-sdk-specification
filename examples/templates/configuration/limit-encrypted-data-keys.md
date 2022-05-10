[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Limit Encrypted Data Kays example

Implementations of this example MUST follow the rules defined in
[Example Templates](../../../examples.md#example-templates).

## Implementations

- [NET](https://github.com/aws/aws-encryption-sdk-dafny/blob/mainline/aws-encryption-sdk-net/Examples/LimitEncryptedDataKeysExample.cs)

## Definitions

### Conventions used in this document

The key words
"MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT",
"SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in
[RFC 2119](https://tools.ietf.org/html/rfc2119).

## Header

```c#
/// Limiting encrypted data keys is most valuable when you are decrypting
/// messages from an untrusted source.
/// By default, the ESDK will allow up to 65,535 encrypted data keys.
/// A malicious actor might construct an encrypted message with thousands of
/// encrypted data keys, none of which can be decrypted.
/// As a result, the AWS Encryption SDK would attempt to decrypt each
/// encrypted data key until it exhausted the encrypted data keys in the message.
```

## Summary

```c#
/// Demonstrate limiting the number of Encrypted Data Keys [EDKs] allowed
/// when encrypting or decrypting a message.
```

## Inputs

- **plaintext**:
  Plaintext to encrypt

- **maxEncryptedDataKeys**:
  Maximum number of encrypted data keys an encrypted message may have.

## Steps

1. Instantiate the EncryptionSDK with MaxEncryptedDataKeys.

2. Create a multi-keyring with maxEncryptedDataKeys keys

```c#
// We will use a helper method to create a Multi Keyring with `maxEncryptedDataKeys` AES Keyrings
```

3. Encrypt the plaintext data with the multi-keyring

4. Decrypt the encrypted data using the multi-keyring you used on encrypt.

5. Demonstrate that the decrypted plaintext is identical to the original plaintext.

6. Demonstrate that an EncryptionSDK with a lower MaxEncryptedDataKeys will fail to decrypt the encrypted message.
