[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Customers should control where encryption context is stored

# Definitions

## MPL

Material Providers Library

## ESDK

Encryption SDK

## Conventions used in this document

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD",
"SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be
interpreted as described in [RFC 2119](https://tools.ietf.org/html/rfc2119).

# Background

The [branch key store](../../framework/branch-key-store.md) needs to persist branch key versions.
DynamoDB was selected as an easy to use option.
However, customers would like additional flexibility.
Not all customers want to use DDB;
S3 or Aurora/RDS have all been suggested.

The important aspect about the key store
is the fact that branch keys can be versioned easily,
and are cryptographically safe to use.
The actual storage medium is not important.

# Requirements

1. Customers SHOULD NOT be forced
   to use a DynamoDB table to store branch keys.

1. Customers SHOULD be able
   to build a shared key store
   that abstracts access to the underlying storage.

1. Customers SHOULD have
   granular control of
   how information is bound to a branch key item.

# Success Measurements

Clear components that can be used
outside of Crypto Tools products.

# Out of Scope

- Additional key types
- Changes to the key store interface
- Changing how custom encryption context is handled

# Design questions

_**Preferred options are always first and italic like this.**_

# Question: How can customers configure different storage options?

## Option 1: _**Define an extendable interface that customers can implement to suit their storage needs.**_

The operations are already well defined.
The code is already broken up to identify this information.
This further bounds the key store to make sure
that new features are always correctly isolated.

## Option 2: Implement individual options

This is not a tractable option.
We could implement some,
but there will always be a missing type.
Additionally, what about customers
who want to store their branch keys in DDB,
but then vend them to downstream microservices?
This is not a new storage system per se.

## Option 3: Extend the DDB SDK or have interceptors

This is possible, but is not customer focused.
This adds _huge_ complexity
and is brittle if we or DDB changes query semantics.

# Question: Should we split the admin functions, (create/version) from the data plane (get)?

## Option 1: _**No, keep all operations in a single client.**_

This makes it easier to implement and
simplifies customer usage.
This makes it harder to separate subtle requirements
between storage and admin.
If a customer introduces a bug in the data client,
and fixes it, this fix may not be ported into the admin client.

Crypto Tools would like to encourage customers to limit write access.
This separation is better done at the key store level.
Otherwise every client has two flavors
and this further complicates things.
Additionally the DDB SDK client is not broken up in this way.

## Option 2: Yes, have a data client and an admin client

Keeping the data client simple makes it easier
for customers to implement a centralized service
that can then serve the encrypted form of branch keys.
They can use the default isolation and only implement
the functions that they need.

Additionally for the admin client
there are complicated concurrency checks that are required.
This kind of locking is not required on the data plane side
so keeping the dependencies for the ultimate clients simpler.

# Question: How should these operations correspond to the key store operations?

## Option 1: _**Every key store operation should have a single persistance operation.**_

This gives granular control over what operations the key store would support.
This also clarifies how the key store composes the persistance
and the authentication/authorization layer.

## Option 2: Simplify operations where possible

This is always possible for the implementer to do.
Trying to do this on the interface
is likely premature optimization.

# Question: What inputs should the persistance operation take?

## Option 1: _**The same inputs as the corresponding key store operation.**_

This aligns the interfaces nicely to the key store.

# Question: What type should the persistance operations return?

## Option 1: _**A union of definite types**_

The returned information needs to have the requested branch key.
It does not need to be a single branch key.
As we have more branch keys with more versions,
being able to pack branch key versions together
may become desirable for performance reasons.
By packing the branch keys versions together,
they can all be unwrapped by a single KMS call.

Having an additional optional set of branch keys
would still result in a KMS call for every branch key.

## Option 2: Definite type

If we only ever wanted to return 1 type this wins.
It makes the shape well defined and makes branch keys
in custom systems more correct.

## Option 3: DDB Item

It is easy, but it makes the dependencies strange.
For customers trying to implement a new storage platform,
this just adds confusion.

## Option 4: A simple hash map

An easier case of a DDB Item.
However, this leaves all the difficulty around communicating required fields.
It is less obvious that some missing information is missing in a simple map.

# Question: How do we evolve the current key store configuration input?

## Option 1: _**Make the DDB members optional and create a new optional union.**_

By making the old interface optional,
current clients are not broken.
The current structure constructors for Java and .NET
are builders and this value could be left off safely.
This is not safe to do for Dafny,
but we do not expect to have any direct Dafny customers.

Also, this is entirely isolated to this package.
So it cannot be broken by combining different versions,
like say ESDK vX with MPL vY.
This is all components inside the MPL.

The old optional members should marked as deprecated.

## Option 2: Major version bump for new classes and methods

This makes for a better interface _now_.
It makes a harder interface to adopt,
but this only matters for this new feature.
It makes documentation harder
because there are now two things
that are different but the same.

To do this we would need to create
a new key store service
and also a new create keyring operation.
Both of these together result in the same
keyring that is constructed today.

# Question: How can customers store custom metadata?

(What if I want to use the JSON-ESDK to store my data?)

## Option 1: _**All custom metadata MUST be in encryption context.**_

This is a safe default.
It mirrors the existing behavior
and does not complicate the system.
To the extent that customers want to
store unauthenticated data they can,
and it is up to them how this authentication
is passed to both KMS and the keyring.

## Option 2: Additional optional data properties

This give greater freedom over the structure,
but it adds complexity to the system.
In this way there are multiple sets of data
that need to be authenticated.

Adding this latter is a 2-way door.
The difficulty is how does this information
move through the system?
Is it on the materials and available to the keyring?
How is it authenticated to KMS?

# Question: Do we also abstract the KMS Client, allowing for custom authorization clients?

## Option 1: _**Only to consolidate the config inputs into a union.**_

It is true that the authorization layer will likely need this abstraction,
however, the inputs outputs and requirements
are not 1000% clear.
By moving the interface to a union,
this work can be easily added later.

## Option 2: Yes

The authorization layer is similar to the persistance layer.
There is every expectation
that this will also need a similar abstraction.

The whole process is simpler to what is outlined above.

## Option 3: No

Having a safe default for the cryptographic authorization
is the most easy to use/hard to misused option.

# Question: Should the persistance store support CreateKeyStore?

## Option 1: _**No**_

The creation of the key store even in DynamoDB is better handled outside of this component. By creating the key store outside a simple library API it is easier to have fine grained control over creation. Point in time recover is just one example.

## Option 2: Yes

While this may seem to make things easier for customer any custom persistance store will by its nature have a custom creation process. Customers can handle this creation any way they like.

# Question: How do verify correctness of this custom storage component?

## Option 1: _**Checking in the key store only**_

The key store needs these invariants,
therefore it should verify them.
On writing we need to assume that a custom component will write what is pass.
But making sure, for example,
that all branch key identifiers stored on branch key creation are the same
is best ensured by the key store.

Similarly, if a branch key is returned, having the key store verify
that the identifier is what it expects,
while maybe frustrating,
is the kind of belt and suspenders correctness we strive for.

## Option 2: Checking in the storage

This shifts the difficulty to the storage component.
However, this is all "good intentions".
There is nothing that makes a customer implement these things correctly.
So we end up checking in the key store or leaving this as a potential sharp edge.

This is not [hard to misuse](../../tenets.md#hard-to-misuse).

## Option 3: Checking in both

This does not help customers and adds more checking everywhere.
It is not clear how this is better.

# Proposal

Changes to the [Key Store's Smithy Model](https://github.com/aws/aws-cryptographic-material-providers-library/blob/main/AwsCryptographicMaterialProviders/dafny/AwsCryptographyKeyStore/Model/KeyStore.smithy#L65-L358)
This is seen in [proposed.smithy](./proposed.smithy)

# One-Way Doors

- API changes live forever.

# Security Considerations

It is now possible for customers
to store and retrieve branch keys
on data that is not authenticated.

This means that the various invariants
that the key store expects
MUST be maintained by the customer implementation.

For example:

1. Branch key insert MUST be an atomic transaction.
   The Active Branch Key, Versioned Branch Key, Beacon Key
   need to either all be written or none of them are written.
   Writing one or two of the three
   makes the persistance store inconsistent.
1. Branch key insert MUST fail if a duplicate branch key id already exists.
1. Branch key version insert MUST be an atomic transaction
   Similar to inserting a new branch key,
   both the Active Branch Key, Versioned Branch Key
   need to either both succeed or both fail.

Any future persistence needs of the Key Store
would require Crypto Tools to evolve the interface
and customers to refactor their implementations
to comply with such needs.
Ideally, these would happen via optional behaviors of the Key Store,
as compared to required behaviors that would break custom implementations.

# Impact/Other considerations

This expands the API surface area and customization options.
Having more options is not always better.
This will add to our docs and our support
as customers explore how to use these options.

This will increase our operational load
as more customers try to understand
and implement their own interfaces.

# Assumptions

- Composing interfaces bounds options.
  This "don't call me, I'll call you"
  kind of injection is powerful,
  but also limits composition.
  The assumption is that bounding these options
  is a good thing.

# Open Questions

None at this time.
