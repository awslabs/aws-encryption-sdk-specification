[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Interacting with a Metrics Interface in the AWS Encryption SDK family of products (Background)

## Definitions

### Conventions used in this document

The key words
"MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT",
"SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in
[RFC 2119](https://tools.ietf.org/html/rfc2119).

## Issues and Alternatives

###  collecting metrics from customers?

Crypto Tools (CT) publishes software libraries. The latest
versions of these libraries have no logging or metrics publishing
to either a local application or to an observability service like AWS CloudWatch.




### Why should supported libraries collect metrics?

Metrics collection has long been an outstanding feature request
that has been 

### Default Behavior?


### Should Data Plane APIs fail if metrics fail to publish?


