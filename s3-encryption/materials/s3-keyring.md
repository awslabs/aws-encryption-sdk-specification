[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# S3 Keyring

## Version

0.1.0

### Changelog

- 0.1.0
  - Initial

## Definitions

### Conventions used in this document

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in [RFC2119](https://tools.ietf.org/html/rfc2119).

## Overview

The S3EC SHOULD implement an S3 Keyring to consolidate validation and other functionality common to all S3 Keyrings.
If implemented, the S3 Keyring MUST implement the Keyring interface.
If implemented, the S3 Keyring MUST NOT be able to be instantiated as a Keyring instance.

### Abstract Methods

In addition to the methods defined in the Keyring interface, the S3 Keyring must define or support the following:

- The S3 Keyring MUST define an abstract method GenerateDataKey.
- The S3 Keyring MUST define an abstract method EncryptDataKey.
- The S3 Keyring MUST define an abstract method DecryptDataKey.

### Functionality

#### OnEncrypt

If the Plaintext Data Key in the input EncryptionMaterials is null, the S3 Keyring MUST call the GenerateDataKey method using the materials.
If the materials returned from GenerateDataKey contain an EncryptedDataKey, the S3 Keyring MUST return the materials.
If the materials returned from GenerateDataKey do not contain an EncryptedDataKey, the S3 Keyring MUST call the EncryptDataKey method using the materials.
The OnEncrypt operation is responsible for ensuring that the EncryptionMaterials are valid and contain valid plaintext and encrypted data keys.

#### OnDecrypt

If the input DecryptionMaterials contains a Plaintext Data Key, the S3 Keyring MUST throw an exception.
If the input collection of EncryptedDataKey instances contains any number of EDKs other than 1, the S3 Keyring MUST throw an exception.
The S3 Keyring MAY validate that the Key Provider ID of the Encrypted Data Key matches the expected default Key Provider ID value.
The S3 Keyring MUST call the DecryptDataKey method using the materials and add the resulting plaintext data key to the materials.
The OnDecrypt operation is responsible for ensuring that the DecryptionMaterials contain valid plaintext and encrypted data keys.
The OnDecrypt operation is also responsible for ensuring that the DecryptionMaterials are valid and contain valid plaintext and encrypted data keys.