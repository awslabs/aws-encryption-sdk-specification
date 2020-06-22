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

| Language | Repository                                                                    |
| -------- | ----------------------------------------------------------------------------- |
| Python   | [aws-encryption-sdk-python](https://github.com/aws/aws-encryption-sdk-python) |

## Definitions

### Conventions used in this document

The key words
"MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT",
"SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in
[RFC 2119](https://tools.ietf.org/html/rfc2119).

### Known-Length Plaintext

Any plaintext input to the Encrypt operation where the total length of that plaintext
can be immediately determined.
For example, if a user supplies plaintext as a string or byte array to Encrypt,
that is a known-length plaintext.

### Unknown-Length Plaintext

Any plaintext input to the Encrypt operation where the total length of that plaintext
cannot be immediately determined.
For example, if a user supplies plaintext as a stream to Encrypt,
that is a unknown-length plaintext.

## Summary

The Encrypt operation takes a plaintext as input that can either have a known length or an
unknown length.
If the input plaintext is a unknown-length plaintext,
the Encrypt operation MUST also take an optional input that bounds the length of that input.

The specification already specifies a [plaintext length](../../client-apis/encrypt.md#plaintext-length)
input on the Encrypt operation that describes a bound on the plaintext length,
however its effect on the Encrypt operation's behavior is unspecified.

This change renames this input to `plaintext length bound` in the specification
to be a more accurate reflection of its behavior and intent,
and specifies the correct behavior during the Encrypt operation.
Specifically, in the scope of the Encrypt operation it's value MUST be passed to the CMM.

Additionally, it is unclear in the spec what the behavior should be
if the input plaintext has a known-length
and the user specifies a bound on the length of that plaintext.

This change proposes that in the scope of the Encrypt operation,
an input plaintext is either of known length,
of unknown length with user supplied estimated size,
or unknown length with no user supplied estimated size.
The Encrypt operation should never consider a `plaintext length bound` alongside
a known-length plaintext.

How a user should express on the API level the intent to encrypt a known-length plaintext
or unknown-length plaintext with or without a bound on the length
depends on the specific implementation
and the idioms of that implementation's language to describe APIs.

## Out of Scope

- Significantly changing the shape of any of our Encrypt API implementations is out of scope.

## Motivation

All implementations allow users to specify a plaintext length when calling Encrypt with a
unknown-length plaintext.
However, its behavior in the Encrypt operation is not clearly specified.

Additionally, some implementations also allow a plaintext length to be specified on Encrypt with a
known-length plaintext.
The behavior of Encrypt in this case is not consistent between implementations.

The purpose of this change is to specify exactly how this input affects the Encrypt operation.

This change renames this input to `plaintext length bound` within the spec because
the intention behind the value of this input is that
it is a max bound of the plaintext length,
set by the user when streaming encryption.
If the actual plaintext length is greater than this value,
something is wrong and the operation MUST fail.
Otherwise, the Encrypt operation MUST pass this value to the CMM.

The intention of this value is not to be a one to one passthrough value to the CMM.
If that were the case,
then we would be concerned with always letting users specify this value for known-length plaintexts,
or with possibly letting users pass in a "unknown length" intent.
We do not want to support these cases.
Users should not be setting a `max plaintext length` value for known-length plaintexts
with the intention of changing CMM behavior.
Instead, users should be specifying this value in for unknown-length plaintexts in order to use CMMs
that depend on plaintext length for their internal logic.

This change additionally renames the `plaintext length` field on GetEncryptionMaterialsRequest to
`max plaintext length` because that better explains the intent behind this field.
This field describes the max size of the plaintext which will be encrypted using the materials
the CMM is to generate.
This is the current state of the behavior, so the specification should describe it as such.
This is renamed to a different name than `plaintext length bound` in order to
distinguish the two controls.

This change does not strictly prescribe how users should express intent for the plaintext
and a possible `plaintext length bound` through an API.
How an API should be designed with these controls in mind depends greatly on the capabilities and
idioms of the language in use.
Specifically, this gets tricky for languages where the idiom is to
accept an object represent a set of user supplied params.
If a user supplies both a known-length plaintext and a `max plaintext length`,
what should be done?
It doesn't make sense to have to check for bad values in the user supplied params,
given it's unstructured nature.
Thus, our specification reccomends that languages SHOULD either ensure that `max plaintext length`
isn't supplied with a known-length plaintext by construction.
If it doesn't, then it SHOULD ignore any user supplied `max plaintext length` in the case that
a known-length plaintext is supplied.

## Drawbacks

This change does not prescribe the name of this input in implementations,
and thus there will not be a standardized name or way of specifying this input across implementations.
This is because this control already exists in implementations under different names,
and it is not worth breaking all customers to rename this input
without significantly changing this input to benefit the customer.

## Security Implications

This change SHOULD NOT have any security implications.

## Operational Implications

This change will break any Python user that depends on the source_length being sent to the
CMM instead of the true length of a known-length plaintext.

## Guide-level Explanation

We need to update the spec to make the purpose and behavior of the `plaintext length` input clear
by renaming it and specifying its exact behavior within the Encrypt operation:

When performing the Encrypt operation on an unknown-length plaintext,
users MUST be able to specify an optional parameter `plaintext length bound`.
The value of this field represents the max length of the plaintext to be encrypted.
The ESDK MUST NOT encrypt a plaintext greater than this length,
and MUST fail if it can be determined during encryption that the actual plaintext length
is greater than what the user supplied on input.
The actual name of this input, and how the user specifies this value for the Encrypt operation
MAY be different per implementation.

When performing the Encrypt operation on a known-length plaintext,
users SHOULD NOT be able to specify a `plaintext length bound`.
If the Encrypt operation is performing on a known-length plaintext,
any such `plaintext length bound` value MUST be ignored.

We also need to specify the exact behavior for how this input is used in the CMM's GetEncryptionMaterials call:

- If this is a known-length plaintext,
  the Encrypt operation MUST pass the real plaintext length as
  `max plaintext length` in the CMM GetEncryptionMaterials call.
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

- Implementations SHOULD ensure that a user is not able to specify both a known-length plaintext
  and a `plaintext length bound` by construction.
- If a user is able to specify both a known-length plaintext and a `plaintext length bound`,
  `plaintext length bound` MUST NOT be used during the Encrypt operation and MUST be ignored.

## Reference-level Explanation

See [Guide-level Explanation](#guide-level-explanation) above.
