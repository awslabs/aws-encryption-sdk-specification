[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# How can the Branch Key's Context be protected without using KMS EC?

# Definitions

See [Definitions](./background.md#definitions).

# 1 Plain-text Commitment instead of KMS Encryption Context

The KMS RSA Keyring has already solved the need
to substitute KMS Encryption Context;
we need only adapt that solution and apply it here.

## 1.1 Branch Key Creation

The KMS RSA Keyring, in `OnEncrypt`,
[establishes an "Encryption Context Digest" by](https://github.com/awslabs/aws-encryption-sdk-specification/blob/8d6bb5665c1017bd64989e4bd66bd8759f1e4b1c/framework/aws-kms/aws-kms-rsa-keyring.md?plain=1#L95-L100):

> 1. Serializing the [encryption context](../../framework/structures.md#encryption-context) from the input [encryption materials](../../framework/structures.md#encryption-materials) according to the [encryption context serialization specification](../../framework/structures.md#serialization).

> 2. Taking the SHA-384 Digest of this concatenation.

Adapting this same pattern to Branch Keys,
rather than working with the encryption context from the encryption materials,
HV-2 will serialize the Branch Key's Context according
to the [encryption context serialization specification](../../framework/../framework/structures.md#serialization),
and then take a SHA-384 Digest of these bytes,
creating the Branch Key's **Branch Key Context Digest**.

This **Branch Key Context Digest** is 48 bytes long,
and MUST be bound to the Branch Key Cryptographic Materials.

1.3 & 1.4 talk about options that use KMS Encrypt to protect the **Branch Key Context Digest**;
thus, without KMS Encrypt access,
an actor cannot modify the **Branch Key Context Digest**.

1.5 considers a local HMAC operation,
with the plain-text AES-256 being the key.

## 1.2 Getting Branch Keys

The Branch Key Item is read from DDB table;
assuming the read Item is allowed by the Branch Key Store client
(KMS Config restriction; [`hierarchy-version-policy`](./background.md#3-how-are-we-going-to-offer-operation-in-a-mixed-mode))
the **Branch Key Context Digest** is recreated on the read values.

`kms:Decrypt` is called.

If (1.3) or (1.4),
break the plain-text response into
the **protected Branch Key Context Digest** and the plain-text AES-256.

Compare the **protected Branch Key Context Digest** to the **Branch Key Context Digest**;
if not equal, fail, else, succeed.

If we go with (1.5),
then we need to use the plain-text AES-256
to verify the MAC.

## 1.3 Binding the **Branch Key Context Digest** via KMS Encrypt

One option is to refactor Branch Key Creation to use `kms:GenerateDataKey`
to get a plain text cryptographic materials.

This **Branch Key Context Digest** is then concatenated with
the plain-text material in a deterministic fashion. 
The result of concatenation is then encrypted with KMS Encrypt.

The option to use local entropy instead of `kms:GenerateDataKey` was rejected primarily because
if this local entropy fails to be random then cryptographic integrity of 
ALL the messages/items protected by the Branch Key Item is compromised.
[//]: # "TODO: Detail more of the GDK vs Local Entropy discussion"


## 1.4 KMS Random and then Bind the **Branch Key Context Digest** via KMS Encrypt

KMS provides the kms:GenerateRandom operation, which generates random bytes without using a specific KMS key.
Unlike operations that use KMS keys, the kms:GenerateRandom operation does not involve any specific KMS key.
As a result, the access control for this operation is only managed through IAM policies, which can either allow or deny the kms:GenerateRandom permission.

Multi-tenant Branch Key Store users 
MAY have an obligation to use 
tenant specific credentials or IAM roles to access a tenant specific KMS Key.
However, these credentials or IAM roles are unlikely to grant `kms:GenerateRandom` permission, 
as it is not related to a KMS Key.
Thus, 
these multi-tenant users would need a separate KMS client,
which would use non-tenant related credentials or IAM role.
This approach leads to a "clunkier" interface, 
as it involves managing more KMS clients.
Hence, Option 1.4 is rejected. 
So, option 1.4 was rejected.

## 1.5 Use Branch Key's cryptographic material in an HMAC on the Branch Key's Metadata and Location

Rather than appending the **Branch Key Context Digest** to the plain-text AES-256,
we can use the plain-text AES-256 as the key
for a HMAC.

In this scenario,
the **Branch Key Context Digest** is passed to an HMAC function with the plain-text AES-256;
the result is a `MAC` (Message Authentication Code) which can be included
on the Branch Key Item as binary field.

**HMAC does not add value compared to a protected digest**:  
The HMAC is created with the plain-text AES-256;
the plain-text AES-256 is avabile to both
Branch Key Store Admins and Branch Key Store Users.

In contrast to the plain-text AES-256,
`kms:Encrypt` access can be restricted to ONLY
Branch Key Store Admins;
Branch Key Store Users have no need of `kms:Encrypt`.

Thus,
the option that affords distinction between
Admin and Users are 1.3 & 1.4.

As such, 1.4 is the recommended path.

**Both HAMC and 1.4 adds complexity but does not add value**:  
To the author's knowledge,
there is no threat mitigated by doing
an HMAC and committing the `mac`
with the plain-text AES-256
via the `kms:Encrypt` call
that is not mitigated by committing
just the **Branch Key Context Digest**.

## 1.6 Downsides to Plain-text Commitment

**Exposure**:  
The plain-text AES-256 is now exposed to the Creating Agent,
where as in HV-1 the plain-text AES-256 is never exposed
to the Creating agent.

However,
the `KeyManagementStrategy` of Encrypt/Decrypt,
introduced by Mutations,
already leaked the plain-text material to Key Store Administrative Agents;
and the `Get*` operations always expose the plain-text material to usage agents.

However,
conversations with Security Engineers have generally
regarded any plain-text material
access outside of KMS to be equivalent.
Thus,
considering this exposure a risk is questionable at best.

**Change of KMS Permissions**:  
HV-1 never required `kms:Encrypt` and `kms:GenerateDataKey` permission.
Migrating to HV-2 will thus need a permission change.

_Note_: `kms:GenerateRandom` permission is required,
but not to any resource (i.e: KMS Key),
only to the calling principle in general.

**Feature Requests to KMS/LockBox**:  
We could also ask KMS or LockBox to consider this use case of
Generate Data Key and Encrypt Payload;
we should not block on that,
but it could be useful for the future.

**KMS Key/IAM Policies Cannot Evaluate Branch Key Location/Metadata**:  
See [Appendix 1](./appendix.md#1-kms-key-admin-policy-downsides-and-rebuttals) and [Appendix 2](./appendix.md#2-mpl-consumer-key-policy-downsides-and-rebuttal).

## 2 KMS HMAC Key

Rather than using the Branch Key's KMS Key to protect all the Branch Key's metadata,
we could use a KMS HAMC Key to protect/validate the metadata,
and only the Branch Key's AES-256 would be protected by the Branch Key's KMS Key.

## 2.1 Branch Key Creation

MPL Consumers (users of the library),
when creating/versioning/mutation Branch Keys,
would provide two KMS Key ARNs:

- An HMAC Key ARN (name subject to bike-shedding) that points to a KMS Key with a Key Spec of HMAC_384
- A KMS Key ARN that points to a KMS Key with a Key Spec of SYMMETRIC_DEFAULT

The Branch Key's AES-256 can than be created by
a `kms:GenerateDataKeyWithoutPlaintext` request,
with the MPL Consumer supplied Encryption Context (unmodified, "foo": "baz");
the responses' `CiphertextBlob` is put into a variable, `enc`.

The HAMC key's ARN is added to the metadata as `kms-hmac-arn`.
All the Branch Key's data,
including the `enc` (so metadata + `enc`)
is then normalized to a byte representation,
which we can call `hmac-input`.

A `kms:GenerateMac` request is constructed
with the `KeyId` of `kms-hamc-arn`,
the `MacAlgorithm` of `HMAC_SHA_384`,
and `Message` of `hmac-input`;
we will call responses `Mac` the `mac`.

The `mac` is added to the metadata,
and all of the metadata and the `enc` are written to DynamoDB.

## 2.2 Getting Branch Keys

The usage Branch Key Store will need
to be configured with a `hmac-key`,
or probably a list of `hamc-key`s, `hamc-keys`.

The process for getting the item is then:

1. Read the item from DDB
2. Ensure the `kms-hmac-arn` is in `hmac-keys`; if not, fail
3. Ensure the `kmsArn` is acceptable to the KMS Configuration; if not, fail
4. re-calculate the `hamc-input`
5. issue a `kms:VerifyMac` request, with `KeyId` of `kms-mac-arn`, `MacAlgorithm` of `HMAC_SHA_384`, `Message` of `hamc-input`, & `Mac` of `mac`; if KMS returns `KMSInvalidMacException`, then the Branch Key has been tampered with, and fail
6. Otherwise, issue a `kms:Decrypt` with `CiphertextBlob` of `enc`, `KeyId` of `kms-arn`, and the Encryption Context
7. If that succeeds, return the plain-text AES-256 as we have been doing

## 2.3 Cons

**More Complicated Permissions**:  
Customers would need to configure and manage
a KMS HMAC Key, the backing DDB table, & the tenant or default KMS Key(s).
This is only one more KMS Key than they already use,
but it is additional complexity.

**Additional Web/KMS Request for Gets Complicate Failures**:  
Whenever fetching Branch Keys,
two KMS requests MUST succeed:

- `kms:VerifyMac`
- `kms:Decrypt`

These SHOULD be serial requests,
or the plain-text material MAY be retrieved
before the metadata has been validated.

(The library could withhold the plain-text material
until both calls, issued in parallel, succeed,
but then we need to consider memory access/thread safety issues;
it is simpler and safer to ensure the calls are sequential.)

Web requests transitively fail for any number of reasons;
Crypto Tools will need to introduce errors that differentiate
between a KMS signing key error and KMS symmetric default error,
and we will need to document that for our customers.

That is effort on both Crypto Tools and it's customers;
HV-1 Branch Keys will fail on one group of conditions,
while HV-2 Branch Keys will fail on a larger group of conditions.

This challenge could be overcome by a couple of means
(error hierarchies,
re-using existing error types but with additional messaging details,
offering [Requirement 5. Support for operating in a mixed HV-1, HV-2 state]()
as a multi-keyring)
but it will be effort.

**Additional Web/KMS Request for Gets Increases Latency**:

The Branch Key Store's `Get*` operations are used by
Amazon Services, and presumably external services,
to service latency sensitive requests.

While working with such services,
Crypto Tools has observed that the KMS requests
are generally the largest driver of latency.

An additional KMS request to use Branch Keys is,
potentially,
a significant increase in latency for these customers.

It is not clear that the KMS HMAC key justifies this cost.

## 2.4 Pros

**An Additional Hurdle For Malicious Writers**:  
The Branch Key Store/Hierarchy Keyring is the only
"data key caching" solution for Client Side of Encryption (CSE)
of DynamoDB items via the AWS Database Encryption SDK for DynamoDB
(DB-ESDK).

The KMS HMAC Key is exclusively managed by the application;
if the application does not want to trust DynamoDB/data base administrators,
but is not the administrators of all the KMS Keys used by the Key Store
(i.e: multi-tenant)
and does not want to utilize strict Branch Key Stores
(as they do not scale well with many KMS Keys),
they can trust their KMS HMAC Key and NOT DynamoDB/the database.

This is a very strong argument FOR using a KMS HMAC Key,
and potentially justifies the additional latency cost,
error complications,
and development complexities.

**Static KMS Symmetric Default Permissions**:  
If Crypto Tools requires the usage of a KMS HMAC Key,
then we can keep the KMS operations that
use the KMS Symmetric Default Key as they are in HV-1.

This simplifies customers who want to transition from HV-1 to HV-2.

# 3 Expand System Key/Double Encryption

This option is much like [2 KMS HMAC Key](#2-kms-hmac-key),
but it allows the MPL Consumers to write
KMS Key/IAM Policies constraints against
the Branch Key's Metadata.

## 3.1 Branch Key Creation

MPL Consumers (users of the library),
when creating/versioning/mutation of Branch Keys,
would provide two KMS Key ARNs:

- A System Key ARN (name subject to bike-shedding) that points to a KMS Key with a Key Spec of SYMMETRIC_DEFAULT
- A KMS Key ARN that points to a KMS Key with a Key Spec of SYMMETRIC_DEFAULT

The Branch Key's AES-256 can than be created by
a `kms:GenerateDataKeyWithoutPlaintext` request against the KMS Key ARN,
with the MPL Consumer supplied Encryption Context (unmodified, "foo": "baz");
the responses' `CiphertextBlob` is put into a variable, `enc`.

`system-key-arn` is added to the Branch Key's Metadata.

All of the Branch Key's Metadata is then put into the `EncryptionContext` of a
`kms:Encrypt` request against the `system-key-arn` with no plain-text.

The resulting `CiphertextBlob` is added
to the Branch Key Item as `aad`,
and the Branch Key is written to storage as normal.

## 3.2 Getting Branch Keys

The usage Branch Key Store will need
to be configured with a `system-kms-arn`,
or probably a list of `system-kms-arn`s, `system-kms-arns`.

The process for getting the item is then:

1. Read the item from DDB
2. Ensure the `system-kms-arn` is in `system-kms-arns`; if not, fail
3. Ensure the `kmsArn` is acceptable to the KMS Configuration; if not, fail
4. issue a `kms:Decrypt` request, with `KeyId` of `system-kms-arn`, `EncryptionContext` of the Branch Key's Metadata, `CiphertextBlob` of `aad`; if KMS returns `KMSInvalidCiphertextException`, then the Branch Key has been tampered with, and fail
5. Otherwise, issue a `kms:Decrypt` with `CiphertextBlob` of `enc`, `KeyId` of `kms-arn`, and the Encryption Context
6. If that succeeds, return the plain-text AES-256 as we have been doing

## 3.3 Cons

Everything in 2.3 applies here,
modulo that the KMS requests are both `kms:Decrypt`.

## 3.4 Pros

Everything in 2.4 applies here,
AND we allow MPL Consumers to write KMS Key/IAM Policies against
the Branch Key Metadata.

# 4 No Protection

Do not protect the Branch Key Metadata.

## 4.1 Pros

None.

## 4.2 Cons

**A new threat model**:  
We would need to re-write the Branch Key Store's
threat model basically from scratch,
likely accepting a number of confused deputy threats.

We would then need to get AppSec sign off for this
more vulnerable iteration (hint: Sanders and Filip were not keen)
and then document this for our customers,
which would require extensive documentation work.

# 5 Binding the **Branch Key Context Digest** via KMS Encryption Context

We could put the **Branch Key Context Digest** into the KMS Encryption Context.

## Pro and Con

This lets us use `kms:GenerateDataKeyWithoutPlaintext`.
But it violates the Requirement 2.
Given the feedback we have been given from PEs across AWS,
including KMS',
we should not violate Requirement 2.
