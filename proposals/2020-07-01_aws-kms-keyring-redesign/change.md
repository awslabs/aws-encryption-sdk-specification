[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Interacting with AWS KMS using the AWS Encryption SDK (Change)

## Affected Features

This serves as a reference of all features that this change affects.

| Features                                                                                                                                              |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| [AWS KMS Keyring](https://github.com/awslabs/aws-encryption-sdk-specification/blob/dbc17f93100667e28dc54e64d05a625db3e5bac2/framework/kms-keyring.md) |
| [AWS KMS Discovery Keyring](https://github.com/awslabs/aws-encryption-sdk-specification/issues/84)                                                    |
| [Client Suppliers](https://github.com/awslabs/aws-encryption-sdk-specification/issues/94)                                                             |
| [Limiting network calls to specific AWS regions](https://github.com/awslabs/aws-encryption-sdk-specification/issues/90)                               |
| [AWS SDK KMS service client caching](https://github.com/awslabs/aws-encryption-sdk-specification/issues/16)                                           |
| [AWS SDK KMS service client initialization/configuration](https://github.com/awslabs/aws-encryption-sdk-specification/issues/15)                      |
| [AWS SDK KMS service client user agent string](https://github.com/awslabs/aws-encryption-sdk-specification/issues/59)                                 |
| [Passing provider info to the AWS KMS Decrypt API Call](https://github.com/awslabs/aws-encryption-sdk-specification/issues/139)                       |

## Affected Specifications

This serves as a reference of all specification documents that this change affects.

| Specification                                                                                                                                         |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| [AWS KMS Keyring](https://github.com/awslabs/aws-encryption-sdk-specification/blob/dbc17f93100667e28dc54e64d05a625db3e5bac2/framework/kms-keyring.md) |

## Affected Implementations

This serves as a reference for all implementations that this change affects.

| Language                                  | Implementation                                                                                                                                              |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C (AWS KMS keyring implementation in C++) | [kms_keyring.cpp](https://github.com/aws/aws-encryption-sdk-c/blob/aa85ca224d550cfe110e2112821a84506b9aca3e/aws-encryption-sdk-cpp/source/kms_keyring.cpp)  |
| Javascript                                | [kms_keyring.ts](https://github.com/aws/aws-encryption-sdk-javascript/blob/75803ed4d3c8b5e86005108c173941c43e81cb56/modules/kms-keyring/src/kms_keyring.ts) |

This change additionally affects the unreleased AWS KMS keyring implementations for Java and Python.

## Definitions

### Conventions used in this document

The key words
"MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT",
"SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in
[RFC 2119](https://tools.ietf.org/html/rfc2119).

## Summary

The AWS Encryption SDK’s (ESDK’s) [AWS KMS Keyring](https://github.com/awslabs/aws-encryption-sdk-specification/blob/dbc17f93100667e28dc54e64d05a625db3e5bac2/framework/kms-keyring.md) has become increasingly complex
as it [supports various customer use cases](background.md).
We are separating the functionality of the AWS KMS keyring into multiple smaller-scoped keyrings.
Each new keyring maintains a smaller API surface area.

By simplifying the AWS KMS keyring, we establish the basic building blocks for interacting with AWS KMS.
We can support additional customer use cases by writing operations to configure a multi-keyring with these smaller-scoped keyrings.
In the future, new features will be supported without refactoring code or updating customer-facing APIs.
Advanced customers can also follow a similar process for more complex customization.
This lowers the likelihood that advanced customers fork ESDK code.

## Out of Scope

1. Any customer interactions with the ESDK that are unrelated to AWS KMS
2. Keyrings other than the AWS KMS keyring
   1. We rely on the functionality of the [multi-keyring](https://github.com/awslabs/aws-encryption-sdk-specification/blob/master/framework/multi-keyring.md),
      but the multi-keyring is out of scope/unchanged
3. [AWS KMS asymmetric CMKs](https://docs.aws.amazon.com/kms/latest/developerguide/symm-asymm-concepts.html#asymmetric-cmks)

## Motivation

1. **Move logic out of the AWS KMS keyring** so a single keyring does not handle
   multiple AWS KMS [CMKs](https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#master_keys)
   ([key names](https://github.com/awslabs/aws-encryption-sdk-specification/blob/dbc17f93100667e28dc54e64d05a625db3e5bac2/framework/kms-keyring.md#key-names)),
   multiple AWS regions,
   or complex functionality (
   [discovery](https://github.com/awslabs/aws-encryption-sdk-specification/blob/dbc17f93100667e28dc54e64d05a625db3e5bac2/framework/kms-keyring.md#is-discovery),
   limiting communication to specific AWS regions,
   AWS SDK client initialization, etc.).
   The smaller scope of the new keyrings reduces the risk of bugs during both ESDK development and ESDK usage.
   This makes them easy to use, hard to misuse.
2. **Create the basic building blocks for interacting with AWS KMS**
   by creating an AWS KMS symmetric keyring and a separate AWS KMS symmetric region discovery keyring
   (see [Reference-level Explanation](#reference-level-explanation)).
   New features are supported by writing operations that configure one or more of these smaller-scoped keyrings.
   These operations also serve as examples, to show customers how we use the basic building blocks for more complex use cases.
   This lowers the risk for one-way doors and makes the customer-facing API easy to use, hard to misuse.
3. **Move AWS SDK client initialization/configuration logic outside of the keyring API runtime**.
   This lowers the potential for keyring API runtime failures.
   There is clear intent/knowledge of _which_ keyring is using _which_ AWS SDK client
   since keyrings are explicitly configured with an AWS SDK client.
   This makes AWS SDK clients easy to use, hard to misuse.
4. **Support additional customer use cases** that cannot be supported today without significant refactors.
   For example, we now support region and key name ordering when _attempting_ decryption.
   For new supported use cases, see [Background](background.md).
   We can continue developing the ESDK with an “easy to use, hard to misuse” mindset.

## Drawbacks

We present a different development style from the existing AWS KMS keyring.
Rather than having a single keyring maintain all AWS KMS logic, logic is broken up into multiple keyrings.
This is a one-way door, but allows for increased flexibility and significantly reduces the risk of future refactors and deprecations.

## Security Implications

We reduce the API surface area of the current AWS KMS keyring.

[Client suppliers](https://github.com/awslabs/aws-encryption-sdk-specification/blob/dbc17f93100667e28dc54e64d05a625db3e5bac2/framework/kms-keyring.md#client-supplier)
are removed from the AWS KMS keyring.
This includes client supplier logic for limiting communication to specific AWS regions.
This removes the security decision of _which_ AWS regions a keyring can communicate with
from the keyring’s OnEncrypt/OnDecrypt API runtime.

AWS SDK clients can be shared among different keyrings.
This was already allowed under the client supplier model, and we make this more explicit,
since any shared clients MUST be configured at keyring initialization instead of keyring API runtime.

## Operational Implications

We MUST re-implement the AWS KMS keyring in all languages the ESDK supports.
Existing ESDKs that have released AWS KMS keyrings require a migration/deprecation path.

The [ESDK for C](https://github.com/aws/aws-encryption-sdk-c/blob/aa85ca224d550cfe110e2112821a84506b9aca3e/aws-encryption-sdk-cpp/source/kms_keyring.cpp)
implements the AWS KMS keyring in C++ and returns generic keyring structs.
The new AWS KMS keyring implementations can be added and the existing keyring implementations can be deprecated.

The [ESDK for JavaScript](https://github.com/aws/aws-encryption-sdk-javascript/blob/75803ed4d3c8b5e86005108c173941c43e81cb56/modules/kms-keyring/src/kms_keyring.ts)
uses a _KMS keyring_ namespace for the AWS KMS keyrings.
The proposal can be implemented in a new _AWS KMS keyring_ namespace.
This now allows the ESDK for JavaScript to use the same AWS KMS naming as other ESDKs.
The previous _KMS keyring_ namespace can be deprecated.

Usage examples and documentation MUST be updated for the new keying implementations.

## Guide-level Explanation

The existing [AWS KMS Keyring](https://github.com/awslabs/aws-encryption-sdk-specification/blob/dbc17f93100667e28dc54e64d05a625db3e5bac2/framework/kms-keyring.md)
encrypts and decrypts data using AWS KMS [CMKs](https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#master_keys).
It also supports the concept of an _AWS KMS discovery keyring_
that is enabled through a derived [_Is Discovery_](https://github.com/awslabs/aws-encryption-sdk-specification/blob/dbc17f93100667e28dc54e64d05a625db3e5bac2/framework/kms-keyring.md#is-discovery) property.

The _AWS KMS discovery keyring_ changes the underlying behavior of the AWS KMS keyring.
It returns the unchanged encryption materials on encryption and _attempts_ to decrypt any encrypted data key,
as long as it can create/initialize an AWS SDK KMS service client (AWS SDK client).

To communicate with AWS KMS, the ESDK’s AWS KMS keyring needs a way to initialize AWS SDK clients.
Current implementations use a [client supplier](https://github.com/awslabs/aws-encryption-sdk-specification/blob/dbc17f93100667e28dc54e64d05a625db3e5bac2/framework/kms-keyring.md#client-supplier)
that initializes/configures AWS SDK clients.
AWS SDK clients are supplied to the AWS KMS keyring at the keyring’s API runtime.
Client suppliers maintain logic for limiting communication to specific AWS regions and caching AWS SDK clients.

To reduce the scope of the AWS KMS keyring,
we are moving the keyring’s functionality into multiple smaller-scoped keyrings.
These smaller-scoped keyrings are configured by what the document calls _keyring-producing operations_.
Depending on the implementation, keyring-producing operations can be thought of as factory methods/builders.
They initialize/configure keyrings.

Keyring-producing operations act as the customer-facing APIs.
Like client suppliers, they initialize AWS SDK clients.
However, AWS SDK clients are now initialized before a keyring is configured.
Keyring-producing operations also handle the load of manually configuring multiple, smaller-scoped keyrings.
They configure all keyrings required to meet a specific customer use case.
If a use case involves multiple AWS regions or multiple key names,
the keyring-producing operation will initialize a [multi-keyring](https://github.com/awslabs/aws-encryption-sdk-specification/blob/master/framework/multi-keyring.md)
of smaller-scoped keyrings.

In summary, rather than having a single keyring maintain all AWS KMS logic,
logic is broken up into multiple smaller-scoped keyrings.
Rather than support multiple keys/AWS regions in a single AWS KMS keyring,
we use keyring-producing operations to configure a [multi-keyring](https://github.com/awslabs/aws-encryption-sdk-specification/blob/master/framework/multi-keyring.md)
of these smaller-scoped keyrings.
The smaller-scoped AWS KMS keyrings become the basic building blocks that keyring-producing operations use to satisfy different customer use cases.

From a customer standpoint, naming will be clearer.
Customers interact with the keyring-producing operations and do not directly interact with the basic building blocks.
However, more advanced users can directly interact with the smaller-scoped keyrings
and write their own keyring-producing operations.
This gives advanced users more flexibility and reduces the need to fork ESDK code in order to meet a specific use case.

## Reference-level Explanation

### AWS KMS symmetric keyring

**Behavior**

The AWS KMS symmetric keyring MUST...

1. Be configured with a single string identifying an AWS KMS CMK
   ([key name](https://github.com/awslabs/aws-encryption-sdk-specification/blob/dbc17f93100667e28dc54e64d05a625db3e5bac2/framework/kms-keyring.md#key-names))
   and MUST be configured with a single AWS SDK KMS service client (AWS SDK client) for that key name.
2. Use the key name and AWS SDK client provided at initialization for encryption and decryption.
3. Fail on decrypt if the encrypted data key’s provider info does not match the keyring’s configured key name.
4. Provide the encrypted data key’s [provider info](https://github.com/awslabs/aws-encryption-sdk-specification/blob/dbc17f93100667e28dc54e64d05a625db3e5bac2/framework/structures.md#key-provider-information)
   as part of the [AWS KMS Decrypt API](https://docs.aws.amazon.com/kms/latest/APIReference/API_Decrypt.html) call.

The AWS KMS symmetric keyring MAY...

1. Be configured with a list of string [grant tokens](https://github.com/awslabs/aws-encryption-sdk-specification/blob/dbc17f93100667e28dc54e64d05a625db3e5bac2/framework/kms-keyring.md#grant-tokens)
   to be included in all AWS KMS calls.

**Decryption Contract**

1. The keyring MUST have access to an AWS KMS client that is configured with credentials for an AWS principal
   that passes an [AWS KMS Decrypt API](https://docs.aws.amazon.com/kms/latest/APIReference/API_Decrypt.html)
   authorization check for the encrypted data key.
2. The encrypted data key’s [provider info](https://github.com/awslabs/aws-encryption-sdk-specification/blob/dbc17f93100667e28dc54e64d05a625db3e5bac2/framework/structures.md#key-provider-information)
   MUST match the keyring’s configured key name.
3. The encryption context MUST exactly match the encryption context used on encrypt.

**Initialization**

On keyring initialization, an AWS KMS symmetric keyring MUST define the following:

- Key Name
- AWS SDK client

On keyring initialization, an AWS KMS symmetric keyring MAY define the following:

- Grant Tokens

### AWS KMS symmetric region discovery keyring

Customers MUST declare their intent to use the AWS KMS symmetric region discovery keyring instead of the AWS KMS symmetric keyring.

**Behavior**

The AWS KMS symmetric region discovery keyring MUST...

1. Be configured with a single AWS SDK client.
   1. Determine the AWS region associated with the provided AWS SDK client.
      In some implementations,
      this MAY require an additional AWS region argument
      during AWS KMS symmetric region discovery keyring initialization.
      If the AWS SDK returns the AWS SDK client’s region
      directly from the AWS SDK client
      in an intuitive manner (by using a single function/method call),
      implementations MUST NOT require an additional AWS region argument.
   2. Only communicate with the AWS region associated with the AWS SDK client.
2. Use the AWS SDK client provided at initialization for all AWS KMS API calls.
3. MUST return an error for the OnEncrypt keyring API, rather than returning the unchanged encryption material.
4. Provide the encrypted data key’s [provider info](https://github.com/awslabs/aws-encryption-sdk-specification/blob/dbc17f93100667e28dc54e64d05a625db3e5bac2/framework/structures.md#key-provider-information)
   as part of the [AWS KMS Decrypt API](https://docs.aws.amazon.com/kms/latest/APIReference/API_Decrypt.html) call.

The AWS KMS symmetric region discovery keyring MAY...

1. Be configured with an AWS account ID.
   1. If an AWS account ID is provided,
      the AWS KMS symmetric region discovery keyring MUST only decrypt encrypted data keys
      that were encrypted using an AWS KMS CMK in that AWS account, for the keyring’s region.
   2. If no AWS account ID is provided,
      the AWS KMS symmetric region discovery keyring MUST _attempt_ to decrypt all encrypted data keys in the keyring’s region.
2. Be configured with a list of string [grant tokens](https://github.com/awslabs/aws-encryption-sdk-specification/blob/dbc17f93100667e28dc54e64d05a625db3e5bac2/framework/kms-keyring.md#grant-tokens)
   to be included in all AWS KMS calls.

**Decryption Contract**

1. The keyring MUST have access to an AWS KMS client that is configured with credentials for an AWS principal
   that passes an [AWS KMS Decrypt API](https://docs.aws.amazon.com/kms/latest/APIReference/API_Decrypt.html)
   authorization check for the encrypted data key.
2. The keyring is unable to write a decryption contract,
   but it MAY fulfill any AWS KMS decryption contract for the configured AWS region and, if provided, the AWS account ID.
   1. Fulfilling any AWS KMS decryption contract MUST be sufficient to succeed.

**Initialization**

On keyring initialization, an AWS KMS symmetric region discovery keyring MUST define the following:

- AWS SDK client (and the AWS SDK client’s region)

On keyring initialization, an AWS KMS symmetric region discovery keyring MAY define the following:

- AWS account ID
- Grant Tokens

### Keyring-Producing Operations

**Please note the following names are not finalized.**

The ESDK MUST provide customers a way to use the following:

1. **AWS KMS symmetric multi-CMK keyring**
   1. MUST be configured with a list of key names
   2. MUST be configured with a key name identifying the [generator](https://github.com/awslabs/aws-encryption-sdk-specification/blob/dbc17f93100667e28dc54e64d05a625db3e5bac2/framework/kms-keyring.md#generator)
   3. MAY be configured with a list of string [grant tokens](https://github.com/awslabs/aws-encryption-sdk-specification/blob/dbc17f93100667e28dc54e64d05a625db3e5bac2/framework/kms-keyring.md#grant-tokens)
      to be included in all AWS KMS calls
   4. MUST configure a multi-keyring of AWS KMS symmetric keyrings...
      1. with a single AWS KMS symmetric keyring for each configured key name
      2. with each AWS KMS symmetric keyring configured with the configured grant tokens, if applicable
      3. where the order of the child keyrings matches the order of the configured key names
2. **AWS KMS symmetric multi-region discovery keyring**
   1. MUST be configured with a list of AWS regions
   2. MAY be configured with an AWS account ID
   3. MAY be configured with a list of string [grant tokens](https://github.com/awslabs/aws-encryption-sdk-specification/blob/dbc17f93100667e28dc54e64d05a625db3e5bac2/framework/kms-keyring.md#grant-tokens)
      to be included in all AWS KMS calls
   4. MUST configure a multi-keyring of AWS KMS symmetric region discovery keyrings...
      1. with a single AWS KMS symmetric region discovery keyring for each configured AWS region
      2. with each AWS KMS symmetric region discovery keyring configured with the configured AWS account ID, if applicable
      3. with each AWS KMS symmetric region discovery keyring configured with the configured grant tokens, if applicable
      4. where the order of the child keyrings matches the order of the configured AWS regions
3. **AWS KMS symmetric all region discovery keyring**
   1. MAY be configured with an AWS account ID
   2. MAY be configured with a list of string [grant tokens](https://github.com/awslabs/aws-encryption-sdk-specification/blob/dbc17f93100667e28dc54e64d05a625db3e5bac2/framework/kms-keyring.md#grant-tokens)
      to be included in all AWS KMS calls
   3. MUST configure an AWS KMS symmetric multi-region discovery keyring...
      1. with a list of all AWS regions
         1. obtained directly from the AWS SDK or from a configuration provided by the AWS SDK
      2. with the configured AWS account ID, if applicable
      3. with the configured grant tokens, if applicable

**All keyring-producing operations MUST...**

1. Initialize/configure the AWS SDK client(s) required for communicating with AWS KMS for the given key names/AWS regions
2. Configure each AWS KMS keyring with the AWS SDK client it needs to communicate with AWS KMS
3. Be configurable with an optional AWS SDK client configuration (client config)
   or a similar AWS SDK language-specific client configuration option
   1. If a client config is provided,
      the keyring-producing operation MUST configure all AWS SDK clients with the provided client config
4. Limit the initialization of new AWS SDK client(s) when possible
   1. Multiple keyrings can be configured with the same AWS SDK client if the following conditions are all met:
      1. Keyrings MUST be configured in the same keyring-producing operation call
      2. Keyrings MUST communicate with AWS KMS in the same AWS region
      3. AWS SDK clients MUST share the same AWS SDK client configuration
5. Maintain the order of all key names/AWS regions provided by the customer

**All keyring-producing operations MAY...**

1. Add an identifier to the user agent string in the AWS SDK client
   that was initialized by the keyring-producing operation
   to note the ESDK language and version

**All keyring-producing operations MUST NOT...**

1. Modify any customer-provided client config
2. Modify the user agent string if the customer has already provided one
3. Modify any AWS SDK client(s) initialized directly by the customer
