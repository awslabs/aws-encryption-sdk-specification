[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Customers should control encryption context

# Definitions

## Conventions used in this document

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD",
"SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be
interpreted as described in [RFC 2119](https://tools.ietf.org/html/rfc2119).

## HV-1

The Branch Key Store's Branch Keys are designated as `"hierarchy-version" : "1"`.

This document proposes changes to theses Branch Keys;
when HV-1 is written,
we mean a Branch Key Item written by the Branch Key Store v0.2.0 to v0.7.0.

## Branch Key's Cryptographic Material

Cryptographic material (AES-256 bit key) generated and protected by KMS.

## Branch Key's Properities

These three values are stored on every
Active,
Version,
and Beacon Key Item in the Branch Key Store's Storage.

They are also present in the KMS Encryption Context.

```json
"kms-arn" : "arn:aws:kms:us-west-2:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab",
"create-time" : "2023-06-03T19:03:29.358Z",
"hierarchy-version" : "1",
```

The Active has an additional field:

```json
"version": "branch:version:83eec007-5659-4554-bf11-699b90f41ac6"
```

## Branch Key's Location

These two values are stored on every
Active,
Version,
and Beacon Key Item in the Branch Key Store's Storage.

For Active:

```json
"branch-key-id" : "bbb9baf1-03e6-4716-a586-6bf29995314b",
"type" : "branch:ACTIVE"
```

For Version:

```json
"branch-key-id" : "bbb9baf1-03e6-4716-a586-6bf29995314b",
"type": "branch:version:83eec007-5659-4554-bf11-699b90f41ac6"
```

For Beacon:

```json
"branch-key-id" : "bbb9baf1-03e6-4716-a586-6bf29995314b",
"type": "beacon:ACTIVE"
```

However,
the Logical Key Store Name is also included in the KMS Encryption Context.

```json
"branch-key-id" : "bbb9baf1-03e6-4716-a586-6bf29995314b",
"type" : "branch:ACTIVE",
"tablename": "KeyStore"
```

These three values describe where the Branch Key is stored; however, the tablename is a logical description, not a physical description.
At this time, no cryptography binds the Branch Key to the physical table.

```json
"branch-key-id" : "bbb9baf1-03e6-4716-a586-6bf29995314b",
"tablename": "KeyStore"
```

These two values label the Branch Key, seperating it from all other Branch Keys.

## Branch Key's Encryption Context

These values are determined by the Branch Key Creator
or last Branch Key Mutator.

In DynamoDB and in KMS Encryption Requests for HV-1,
their keys are prefixed with `aws-crypto-ec:`.

```json
"aws-crypto-ec:department" : "admin"
```

However,
when returned to the requesters of the Branch Key Store's
`Get*Key*` operations,
the prefix is removed.

## Branch Key's Context

The union of the Branch Key's:

- Properities
- Location (including logical key store name)
- Encryption Context

# Background

The current Branch Key Store's Branch Keys use KMS Encryption Context
to cryptographically bind the Branch Key's cryptographic material to
the Branch Key's Context.

This cryptographic binding mitigates a number of threats around
storing the Branch Keys
and is vital to the safe usage of the Hierarchal Keyring.

However,
it is not clear that this is the best use of KMS Encryption Context,
as it interferes with customers ability to use KMS Key Policies to
constrain Key Usage.

Further more,
Encryption Context evaluation can be customized by the calling principles authorization;
KMS Key Grants can have restricted but unique conditions.

Many potential Branch Key Customers are prevented from using
the Hierarchy Keyring,
as they have pre-existing Key Policies with their tenants
that cannot be met if the KMS Encryption Context is populated
by the Branch Key's Context.


# Requirements

1. Branch Key's Context be cryptographically bound to the Branch Key's Cryptographic Material

2. Branch Key's Encryption Context, untransformed in any way, is the KMS Encryption Context

3. Support for all of Behaviors of the current Branch Key Store (Create, Version, Get\*)

# Out of Scope

- Abstracting away from KMS
- Supporting any Branch Key protection Scheme via the DB-ESDK, much like the DDBEC's MetaStore.

## Why not Abstract away from KMS

Over the past year,
Crypto Tools has spent a significant amount of our time
supporting services integrating with KMS for multi-tenant applications.

While we MAY eventually want to support GCP or Azure,
we MUST focus on the fasting growing customer base we have;
AWS Services and Software-as-a-service providers integrating with KMS.

## Why not the MetaStore approach?

The MetaStore was the predecessor to the Branch Key Store; 
it is the "caching" solution for the legacy DynamoDB Encryption Client (DDBEC). 
The MetaStore used the DDBEC itself to protect the hierarchical material with KMS;
this affords for some flexibility, 
as the MetaStore was an interface that exposes the full breadth of DDBEC functionality.
This gives customers significant freedom on what data is bound to a Branch Key Item's material and how that binding is facilitated. 

However, our customers have complained that the DB-ESDK is complicated;
using the DB-ESDK to protect the materials used by the DB-ESDK and the ESDK is NOT
a step towards simplification.

While such a feature MAY provide the greatest flexibility to
our customers,
it is not a simplification of the Hierarchy Keyring,
but a complication to it.
It also would make the DB-ESDK a dependency of the ESDK,
and introduce a circular dependency between the MPL and the DB-ESDK. 


# Design Questions

## 1 How can the Branch Key's Context be protected without using KMS EC?

See [DesignQuestion.md](./DesignQuestion.md).

## 2 How are we going to offer operation in a mixed mode?

UPDATE: 2.1 was rejected.
There will be no Policy (2.2).

### 2.1 `hierarchy-version-policy`

Much like [Key Commitment](https://docs.aws.amazon.com/encryption-sdk/latest/developer-guide/concepts.html#key-commitment),
I suggest we introduce a policy that
would allow for mixed usage or restricting to one or the other.

Something like `hierarchy-version-policy`:

- ALLOW_V1
- ALLOW_V2
- ALLOW_V1_OR_V2
- ANY

This policy would be part of (all) Branch Key Store configuration.

(all: Branch Key Store, any future Branch Key Store Usage client.)

This allows our customers to
restrict to one KMS Encryption Context
experience or another.

The effort to implement and test this is very low,
relative to other code paths in this effort.

### 2.2 Do Nothing

UPDATE: We are going with Do Nothing

There is no immediate customer demand for a policy like this.
In general,
the Branch Key in the table,
in combination with KMS,
the authority of it's treatment.

However,
given the low effort required to implement/support this,
and the aid it gives our customers in having
a consistent KMS Encryption Context experience,
I suggest we implement the policy.

### 2.3 Pros of 2.1

**Update Readers, than Writers**:  
To use HV-2,
customers already using the H-Keyring will need
to update their readers before they start creating
or mutating Branch Keys to HV-2.

i.e: They need to update their readers before they update their writers.

This alone is justification for the policy.

**Consistent KMS Encryption Context**:  
The arguments for the HV-1 Encryption Context suggest
users SHOULD be able to restrict their Branch Key Store clients
to a HV-1 such that they know any IAM or KMS Key Policies
they created that depend on HV-1's Encryption Context
are still valid.

### 2.4 Cons

**Additional Development work and documentation**:  
Nothing is free;
we would need to implement, document, test, and maintain this policy.

Still,
the migration benefit justifies this cost.

## 3 Branch Key Creation

UPDATE: The team decided that the Branch Key Store would create and version both HV-1 and HV-2 BKs.

UPDATE: The team changed their mind; the Branch Key Store WILL support HV-2 Branch Key Creation, via a flag.

Customers MUST be able to chose which `hierarchy-version`
new Branch Keys are created with.

The question is what should the UX be.

### 3.1 Specify the `hierarchy-version` at Creation

Currently, our library has one Branch Key Creation operations:

- `BranchKeyStore#CreateKey`

To this operation,
we could add a flag that dictates the `hierarchy-version` to be created with.

If that flag conflicts with `hierarchy-version-policy`,
then FAIL.

Otherwise, respect the flag.

**Plumbing through `GenerateRandom`**:  
UPDATE: `kms:GenerateDataKey` closed this negative consequence.  
We will had to add an optional `AwsKms` input
to supply the plain-text data key.

### 3.2 Follow the Configuration

This does not work if the configuration is `ALLOW\_V1\_OR_V2`;
this is not recommended.

### 3.3 New Operation or Client

We could leave the old Branch Key Store alone,
and introduce a new Branch Key Store V2.

The UX advantage here is that we can introduce new error types
without breaking customers.

For example,
the creation of the `hierarchy-version-policy` implies
that we will need an error type for rejecting a Branch Key
that does not match.

Particularly if we went down the additional KMS approaches (1.2, 1.3),
new error types will need to be created to represent
failures from the additional KMS key.

But we have committed to 1.4;
this limits the failure modes/additional errors
to the point that I do not think new client
or operation is needed.

### 3.4 Author's conclusion

Unless someone can think of something else,
3.1.

## 4 Branch Key Versioning (Rotation)

UPDATE: The team elected for 3.5; we will Mirror 3.5.
(BKS can VersionKey HV-1 or HV-2).
