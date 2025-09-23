[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

## Version

0.1

### Changelog

0.1 - initial

### Definitions

- MapKey/mapkey
  - To distinguish the keys of a map (as in, key - value pairs), the term MapKey/mapkey is used to denote such a key
- Object Metadata
  - This refers to the "User-defined object metadata" feature in S3 which allows the client to associate key-value pairs with a given S3 object.
- Instruction File
  - A file, stored as a separate S3 object, which contains some or all of the cryptographic metadata required for decryption

This specification assumes basic familiarity with Amazon S3 (Simple Storage Service).

## Implementations

### V3

[Java v3 Encoding (write)](https://github.com/aws/amazon-s3-encryption-client-java/blob/main/src/main/java/software/amazon/encryption/s3/internal/ContentMetadataEncodingStrategy.java)
[Java v3 Decoding (read)](https://github.com/aws/amazon-s3-encryption-client-java/blob/main/src/main/java/software/amazon/encryption/s3/internal/ContentMetadataDecodingStrategy.java)
[Go v3](https://github.com/aws/amazon-s3-encryption-client-go/blob/8a052f61c5940cc52018c82f94e8173822c27672/v3/internal/strategy.go)

## Overview

Content metadata, in the context of the S3 Encryption Client, refers to the information stored along with a given object that is required to decrypt the object.
This specification addresses where and how the S3EC locates the content metadata, referred to as strategies.
For details on the information represented by the content metadata, refer to [Content Metadata](./content-metadata.md).

### Supported Metadata Strategies

There are currently two supported content metadata strategies:

- Object Metadata
- Instruction File

### Differences Between Metadata Strategies

Certain metadata strategies MAY support certain features.
Feature support is dependent on the nature of the metadata strategy's implementation.
Features:

- double-encoding decoding (specific to Object Metadata)
- data key re-encryption/key rotation (Instruction File only)

### Object Metadata

Object Metadata refers to the set of mapkey-value pairs stored alongside an object in S3.
By default, the S3EC MUST store content metadata in the S3 Object Metadata.
When an encrypted object is stored in S3 with non-US-ASCII Materials Description or Encryption Context, the S3 Server will apply an esoteric "double encoding" to the metadata.
The S3EC SHOULD support decoding the S3 Server's "double encoding".
If the S3EC does not support decoding the S3 Server's "double encoding" then it MUST return the content metadata untouched.

### Instruction File

Instruction Files are a separate S3 object which contain content metadata.
The S3EC MUST support writing some or all (depending on format) content metadata to an Instruction File.
The content metadata MUST be serialized to a JSON string.
The serialized JSON string MUST be the only contents of the Instruction File.

Instruction File writes MUST NOT be enabled by default.
Instruction File writes MUST be optionally configured during client creation or on each PutObject request.
The default Instruction File behavior uses the same S3 object key as its associated object suffixed with ".instruction".

The S3EC MAY support re-encryption/key rotation via Instruction Files.
Further details on Instruction File re-encryption can be found in (TODO).
The S3EC MUST NOT support providing a custom Instruction File suffix on ordinary writes; custom suffixes MUST only be used during re-encryption.
The S3EC SHOULD support providing a custom Instruction File suffix on GetObject requests, regardless of whether or not re-encryption is supported.

#### V1/V2 Instruction Files

In the V1/V2 message format, all of the content metadata MUST be stored in the Instruction File.

#### V3 Instruction Files

In the V3 message format, only the content metadata related to the encrypted data is stored in the Instruction File.
In the V3 message format, the content metadata related to the encrypted content is stored in the Object Metadata.

- The V3 message format MUST store the mapkey "x-amz-c" and its value in the Object Metadata.
- The V3 message format MUST NOT store the mapkey "x-amz-c" and its value in the Instruction File.
- The V3 message format MUST store the mapkey "x-amz-d" and its value in the Object Metadata.
- The V3 message format MUST NOT store the mapkey "x-amz-d" and its value in the Instruction File.
- The V3 message format MUST store the mapkey "x-amz-i" and its value in the Object Metadata.
- The V3 message format MUST NOT store the mapkey "x-amz-i" and its value in the Instruction File.

- The V3 message format MUST store the mapkey "x-amz-3" and its value in the Instruction File.
- The V3 message format MUST store the mapkey "x-amz-w" and its value in the Instruction File.
- The V3 message format MUST store the mapkey "x-amz-m" and its value (when present in the content metadata) in the Instruction File.
- The V3 message format MUST store the mapkey "x-amz-t" and its value (when present in the content metadata) in the Instruction File.

This is done to facilitate data key re-encryption via Instruction File.
