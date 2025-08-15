[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Keyrings

This specification refers to Keyrings used in S3EC v3 and is largely similar to the keyring interface present in the Material Providers Library (MPL), available [here](https://github.com/awslabs/aws-encryption-sdk-specification/blob/master/framework/keyring-interface.md).

## Version

0.1.0

### Changelog

- 0.1.0
  - Initial

## Definitions

### Conventions used in this document

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in [RFC2119](https://tools.ietf.org/html/rfc2119).

## Interface

The Keyring interface and its operations SHOULD adhere to the naming conventions of the implementation language.

The Keyring interface MUST include the OnEncrypt operation.
The OnEncrypt operation MUST accept an instance of EncryptionMaterials as input.
The OnEncrypt operation MUST return an instance of EncryptionMaterials as output.

The Keyring interface MUST include the OnDecrypt operation.
The OnDecrypt operation MUST accept an instance of DecryptionMaterials and a collection of EncryptedDataKey instances as input.
The OnDecrypt operation MUST return an instance of DecryptionMaterials as output.

## Supported Keyrings

The Amazon S3 Encryption Client provides the following keyring implementations:

- [S3 Keyring](s3-keyring.md)
- [S3 KMS Keyring](s3-kms-keyring.md)
- [S3 AES Keyring](s3-aes-keyring.md)
- [S3 RSA Keyring](s3-rsa-keyring.md)

Note: A user MAY create their own custom keyring(s).
