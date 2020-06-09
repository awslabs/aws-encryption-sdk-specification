[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# AWS Encryption SDK Specification

## Overview

This repository contains the AWS Encryption SDK Specification.  
The primary goal of this specification is to define a standard,
language independent, description of the AWS Encryption SDK features.  
It serves as the source of truth for the features that make up the AWS Encryption SDK
and the details of their behavior.
It is intended to promote consistency and interoperability
across implementations of the AWS Encryption SDK.  
This GitHub project is also intended to track issues and feature requests,
and to collect feedback pertaining to the AWS Encryption SDK.

[Security issue notifications](./CONTRIBUTING.md#security-issue-notifications)

### Current Implementations

Below is the list of current implementation of this specification:

- [C](https://github.com/aws/aws-encryption-sdk-c)
- [Java](https://github.com/aws/aws-encryption-sdk-java)
- [Python](https://github.com/aws/aws-encryption-sdk-python)
- [CLI](https://github.com/aws/aws-encryption-sdk-cli)
- [Javascript](https://github.com/awslabs/aws-encryption-sdk-javascript)

## License Summary

The documentation is made available under the Creative Commons Attribution-ShareAlike 4.0 International License. See the LICENSE file.

The sample code within this documentation is made available under the MIT-0 license. See the LICENSE-SAMPLECODE file.

## Editing

We use `prettier` to maintain consistent formatting.
Our CI will stop PRs that do not match our formatting requirements,
but to easily apply them,
run `./ci/prettify.sh write`.
If you want to check them without writing,
run `./ci/prettify.sh check`.
