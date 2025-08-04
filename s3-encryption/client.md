# Client

## Version

0.1.0

### Changelog

- 0.1.0
  - Initial

## Definitions

### Conventions used in this document

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in [RFC2119](https://tools.ietf.org/html/rfc2119).

### Key Material

An AES or RSA key, or a valid AWS KMS key identifier.

### Client Initialization

Client initialization refers to the process by which a new S3EC instance is created.
Depending on the language, this could be a builder (using the Builder pattern) or a constructor.

## Overview

This document describes the top-level public S3 Encryption Client (S3EC). 
The S3EC provides client-side encryption for Amazon S3.

## AWS SDK Compatibility

The S3EC MUST adhere to the same interface for API operations as the conventional AWS SDK S3 client. 
In other words, the SDK's conventional S3 client is able to be substituted for the S3EC. 
The S3EC MUST provide a different set of configuration options than the conventional S3 client.

## Configuration

### Cryptographic Materials

The S3EC MUST accept either one CMM or one Keyring instance upon initialization.
If both a CMM and a Keyring are provided, the S3EC MUST throw an exception.
When a Keyring is provided, the S3EC MUST create an instance of the DefaultCMM using the provided Keyring. 

The S3EC MAY accept key material directly. 
When only key material is provided, a Keyring corresponding to the type of key material is created by default.
This behavior is discouraged, as it requires all Keyring configuration options to be supported by client initialization. 
This leads to customer confusion when a Keyring is provided and a Keyring option is set on the client, and thus not applied.
It is considered deprecated, meaning it will be removed in the next major version (v4). 

### Options

#### Enable Legacy Wrapping Algorithms

The S3EC MUST support the option to enable or disable legacy wrapping algorithms. 
The option to enable legacy wrapping algorithms MUST be set to false by default. 
When enabled, the S3EC MUST be able to decrypt objects encrypted with all supported wrapping algorithms (both legacy and fully supported).
When disabled, the S3EC MUST NOT decrypt objects encrypted using legacy wrapping algorithms.

#### Enable Legacy Unauthenticated Modes

The S3EC MUST support the option to enable or disable legacy unauthenticated modes (content encryption algorithms).
The option to enable legacy unauthenticated modes MUST be set to false by default. 
When enabled, the S3EC MUST be able to decrypt objects encrypted with all content encryption algorithms (both legacy and fully supported).
When disabled, the S3EC MUST NOT decrypt objects encrypted using legacy content encryption algorithms.

#### Enable Delayed Authentication

The S3EC MUST support the option to enable or disable Delayed Authentication mode.
Delayed Authentication mode MUST be set to false by default. 
When enabled, the S3EC MAY release plaintext from a stream which has not been authenticated.
When disabled the S3EC MUST NOT release plaintext from a stream which has not been authenticated. 

#### Set Buffer Size

The S3EC SHOULD accept a configurable buffer size which refers to the maximum ciphertext length to store in memory when delayed authentication mode is disabled.

### Wrapped S3 Client(s)

The S3EC MUST support the option to provide an SDK S3 client instance during its initialization.

### Instruction File Configuration

The S3EC MAY support the option to provide Instruction File Configuration during its initialization.
If the S3EC in a given language supports Instruction Files, then it MUST accept Instruction File Configuration during its initialization.
In this case, the Instruction File Configuration SHOULD be optional, such that its default configuration is used when none is provided.

### Inherited SDK Configuration

The S3EC MAY support directly configuring the wrapped SDK clients through its initialization.
For example, the S3EC MAY accept a credentials provider instance during its initialization. 
If the S3EC accepts SDK client configuration, the configuration MUST be applied to all wrapped S3 clients.
If the S3EC accepts SDK client configuration, the configuration MUST be applied to all wrapped SDK clients including the KMS client.
If the S3EC accepts any SDK client configuration options, then the S3EC should support all possible configuration options. 

### Other Dependencies

#### Randomness

The S3EC MAY accept a source of randomness during client initialization.
The inclusion of a source of randomness is subject to language availability. 

## API Operations

The S3EC must provide implementations for the following S3 operations:
* GetObject MUST be implemented by the S3EC.
  * GetObject MUST decrypt data received from the S3 server and return it as plaintext. 
* PutObject MUST be implemented by the S3EC.
  * PutObject MUST encrypt its input data before it is uploaded to S3.
* DeleteObject MUST be implemented by the S3EC.
  * DeleteObject MUST delete the given object key.
  * DeleteObject MUST delete the associated instruction file using the default instruction file suffix.
* DeleteObjects MUST be implemented by the S3EC.
  * DeleteObjects MUST delete each of the given objects.
  * DeleteObjects MUST delete each of the corresponding instruction files using the default instruction file suffix.

The S3EC may provide implementations for the following S3 operations:
* CreateMultipartUpload MAY be implemented by the S3EC.
  * If implemented, CreateMultipartUpload MUST initiate a multipart upload.
* UploadPart MAY be implemented by the S3EC.
  * UploadPart MUST encrypt each part.
  * Each part MUST be encrypted in sequence.
  * Each part MUST be encrypted using the same cipher instance for each part.
* CompleteMultipartUpload MAY be implemented by the S3EC.
  * CompleteMultipartUpload MUST complete the multipart upload.
* AbortMultipartUpload MAY be implemented by the S3EC.
  * AbortMultipartUpload MUST abort the multipart upload.

The S3EC may provide implementations for the following S3EC-specific operation(s):
* ReEncryptInstructionFile MAY be implemented by the S3EC. 
  * ReEncryptInstructionFile MUST decrypt the instruction file's encrypted data key for the given object using the client's CMM.
  * ReEncryptInstructionFile MUST re-encrypt the plaintext data key with a provided keyring.
