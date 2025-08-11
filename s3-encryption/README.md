[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Amazon S3 Encryption Client v3 Specification

This specification applies to the S3 Encryption Client v3.

The specification is based primarily on the Java implementation, which is considered authoritative in terms of functionality.

### Current Implementations

Below is the list of current implementations of this specification:

- [Java](https://github.com/aws/amazon-s3-encryption-client-java)
- [Go](https://github.com/aws/amazon-s3-encryption-client-go)

There are other implementations of the S3 Encryption Client which do not necessarily adhere to this specification, but are compatible with respect to encrypt/decrypt compatibility:

- [Dotnet](https://github.com/aws/amazon-s3-encryption-client-dotnet)

This includes the following S3EC implementations which are bundled with the AWS SDK for the given language:

- [C++ (v2)](https://github.com/aws/aws-sdk-cpp/tree/main/src/aws-cpp-sdk-s3-encryption)
- [Ruby (v2)](https://github.com/aws/aws-sdk-ruby/tree/version-3/gems/aws-sdk-s3/lib/aws-sdk-s3/encryptionV2)
- [PHP (v2)](https://github.com/aws/aws-sdk-php/tree/master/src/S3/Crypto)
