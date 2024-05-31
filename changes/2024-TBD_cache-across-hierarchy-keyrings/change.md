[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Cache Across Hierarchy Keyrings

## Affected Features

This serves as a reference of all features that this change affects.

| Feature                                                                                 |
| --------------------------------------------------------------------------------------- |
| [Keystore](../../framework/branch-key-store.md)                                         |
| [AWS KMS Hierarchical Keyring](../../framework/aws-kms/aws-kms-hierarchical-keyring.md) |

## Affected Specifications

This serves as a reference of all specification documents that this change affects.

| Specification                                                                           |
| --------------------------------------------------------------------------------------- |
| [Keystore](../../framework/branch-key-store.md)                                         |
| [AWS KMS Hierarchical Keyring](../../framework/aws-kms/aws-kms-hierarchical-keyring.md) |

## Affected Implementations

| Language | Version Introduced | Version Removed | Implementation                                                                                                                                                                                                                                                                                      |
| -------- | ------------------ | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dafny    | 1.4.0              | n/a             | [AwsKmsHierarchicalKeyring.dfy](https://github.com/aws/aws-cryptographic-material-providers-library/blob/main/AwsCryptographicMaterialProviders/dafny/AwsCryptographicMaterialProviders/src/Keyrings/AwsKms/AwsKmsHierarchicalKeyring.dfy)                                                          |
| Java     | 1.4.0              | n/a             | [CreateAwsKmsHierarchicalKeyringInput.java](https://github.com/aws/aws-cryptographic-material-providers-library/blob/main/AwsCryptographicMaterialProviders/runtimes/java/src/main/smithy-generated/software/amazon/cryptography/materialproviders/model/CreateAwsKmsHierarchicalKeyringInput.java) |
| .NET     | 1.4.0              | n/a             | [CreateAwsKmsHierarchicalKeyringInput.cs](https://github.com/aws/aws-cryptographic-material-providers-library/blob/main/AwsCryptographicMaterialProviders/runtimes/net/Generated/AwsCryptographicMaterialProviders/CreateAwsKmsHierarchicalKeyringInput.cs)                                         |

## Definitions

TODO

### Conventions used in this document

The key words
"MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT",
"SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in
[RFC 2119](https://tools.ietf.org/html/rfc2119).

## Summary

TODO

## Out of Scope

TODO

## Motivation

TODO

### Hierarchy Keyring Caching

Currently, the Hierarchy Keyring creates its own cache.

To facilitate Caching performance across Keystores/KMS Clients/KMS Keys,
we could (optionally) break the Cache out of the Hierarchy Keyring.

The Hierarhcy Keyring would instead take a constructed a Cache as
an arguement during initialization.

When writing to the Cache,
the Hierarchy Keyring would include the Keystore's ID,
which, ideally, uniquely identifies its KMS relationship.

By KMS Relationship, we mean any or all of the following:

- KMS Configuration
- Credentials used when creating the KMS Client, and thus used when calling KMS
- Other properties of the KMS Client, such as the region, or request headers

The changes proposed (and comitted to) here
do not include such a Cache refactoring,
as that would not address the stated goal
of allowing one Keystore to work across multiple
KMS ARNs.

## Operational Implications

TODO

## Reference-level Explanation

TODO
