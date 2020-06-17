[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Encrypt Max Plaintext Length Input

## Affected Features

| Feature                                           |
| ------------------------------------------------- |
| [Encrypt](../../client-apis/encrypt.md)           |
| [CMM Interface](../../framework/cmm-interface.md) |


## Affected Specifications

| Specification                                     |
| ------------------------------------------------- |
| [Encrypt](../../client-apis/encrypt.md)           |
| [CMM Interface](../../framework/cmm-interface.md) |


## Affected Implementations

| Language   | Repository                                                                            |
| ---------- | ------------------------------------------------------------------------------------- |
| Python     | [aws-encryption-sdk-c](https://github.com/aws/aws-encryption-sdk-python)              |
| Javascript | [aws-encryption-sdk-javascript](https://github.com/aws/aws-encryption-sdk-javascript) |

## Definitions

### Conventions used in this document

The key words
"MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT",
"SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in
[RFC 2119](https://tools.ietf.org/html/rfc2119).

### Known-Length Plaintext

Any plaintext input to the Encrypt where the total length of that plaintext
can be immediately determined.
For example, if a user supplies plaintext as a string or byte array to Encrypt,
that is a known-length plaintext.

### Unknown-Length Plaintext

Any plaintext input to the Encrypt operation where the total length of that plaintext
cannot be immediately determined.
For example, if a user supplies plaintext as a stream to Encrypt,
that is a unknown-length plaintext.

## Summary

When performing the encrypt operation on an unknown length plaintext,
users MUST be able to specify some input that bounds the length of the plaintext to be encrypted.

This input already exists in the specification as [plaintext length](../../client-apis/encrypt.md#plaintext-length)
however it's effect on the Encrypt operation's behavior is unspecified.

This change renames this input in the specification
to be a more accurate reflection of it's behavior,
and specifies the correct behavior during the Encrypt operation.

## Out of Scope

- How different implementations may allow a user to specify this input for the Encrypt operation
  is out of scope.
- Significantly changing the shape of any of our Encrypt API implementations is out of scope.

## Motivation

All implementations allow users to specify a plaintext length when calling Encrypt with a
unknown-length plaintext.
However, it's behavior in the Encrypt operation is not clearly specified.

Additionally, some implementations also allow a plaintext length to be specified on Encrypt with a
known-length plaintext.
The behavior of Encrypt in this case is not consistent between implementations.

The purpose of this change is to document the correct behavior of this input and
rename this input to clarify it's intent.

This change renames this input within the spec because
the intention behind the value of this input is that
it is a bound on the plaintext length,
not the exact value.
This is what the Encrypt operation enforces when this value is set,
and this is how CMMs should interpret this value in GetEncryptionMaterials if it is set.
Implementations already treat this input with this intent in mind,
so we should describe it in the specification as such.

This change specifies that the Encrypt operation MUST pass the real length of the plaintext
to the CMM if known instead of a user supplied bound because the former is more accurate.
There is no case where a user would benefit from passing
a less accurate `max plaintext length` to the CMM.
If there were such a case,
then such a CMM is not correctly using the intent behind `maxPlaintextLength`.
It is better to restrict flexibilty here so that users have less opportunity
to depend on behaviors from CMMs that are misusing this value.

## Drawbacks

This change does not prescribe the name of this input in implementations,
and thus there will not be a standardized name or way of specifying this input across implementations.
This is because this control already exists in implementations under different names,
and it is not worth breaking all customers to rename this input
without significantly changing this input to benefit the customer.

## Security Implications

This change SHOULD NOT have any security implications.

## Operational Implications

This change will break any JS user that is currently using Encrypt with a known-length plaintext
and inputting a plaintextLength less than that length.

This change will break any Python user that depends on the source\_length being sent to the
CMM instead of the true length of a known-length plaintext.

## Guide-level Explanation

This change renames the `plaintext length` Encryption input to `max plaintext length` in the specification,
and clarifies it's behavior in the Encrypt operation.

If during the Encrypt operation it is determined that
the actual plaintext length is greater than a supplied `max plaintext length`,
the operation MUST fail.

Additionally, when calling the CMM's GetEncryptionMaterials call during the Encrypt operation,
the operation MUST pass in the length of the input plaintext if it can be known.
If it can't be known, the operation passes in `max plaintext input` if supplied.
If it can't be known and no `max plaintext input` is supplied, the operation supplies no value for
this field.

This change also renames the `plaintext length` field in the CMM interface to `max plaintext length`.

Finally, this change specifies when this input should be available for users to specify:
if and only if the input plaintext can be of unknown-length.

## Reference-level Explanation

We need to update the spec to make the purpose and behavior of the `plaintext length` input clear
by renaming it and specifying it's exact behavior within the Encrypt operation:

When performing the encrypt operation on a unknown-length plaintext,
users MUST be able to specify an optional parameter `maxPlaintextLength`.
The value of this field represents the bound on the length of the plaintext to be encrypted.
The ESDK MUST NOT encrypt a plaintext greater than this length,
and MUST fail if it can be determined during encryption that the actual plaintext length
is greater than what the user supplied on input.
The actual name of this input, and how the user specifies this value for the Encrypt operation
 MAY be different per implementation.

We also need to specify the exact behavior for how this input is used in the CMM's GetEncryptionMaterials call:

- If this is a known-length plaintext,
  the Encrypt operation MUST pass the real plaintext length as
  `maxPlaintextLength` in the CMM GetEncryptionMaterials call.
  (regardless of whether maxPlaintextLength was supplied on input),
- If the length of the plaintext is not known and `maxPlaintextLength` was supplied on input,
  the Encrypt operation MUST pass the supplied `maxPlaintextLength`
  to the CMM GetEncryptionMaterials call.
- If the length of the plaintext is not known and `maxPlaintextLength` was not supplied on input,
  the Encrypt operation MUST NOT specify a `maxPlaintextLength`
  in the CMM GetEncryptionMaterials call.

Similarly, we should rename the `plaintext length` field in the `GetEncryptionMaterialsRequest`
to `max plaintext length` to clarify its intent.

The CMM interface's GetEncryptionMaterialsRequest MUST contain a field `maxPlaintextLength`
that represents the maximum size of the plaintext that will be encrypted using these materials.
The actual name of this field MAY be different per implementation.

Finally, we should specify the following for implementations of APIs that do the Encrypt operation:

- If exposing an API where the plaintext length is always known from the input plaintext,
  then the ESDK MUST NOT provide `max plaintext length` as a user input.
- If exposing an API where it is possible for the length of the plaintext to be unknown on input,
  then the ESDK MUST provide an optional `max plaintext length` input.
