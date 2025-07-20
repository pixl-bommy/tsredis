# tsredis

## Testing

This project uses the Node.js test runner. Since the code is written in TypeScript, Node.js version 24 or higher is required.

**Test the entire project**

```shell
node --test
```

**Test the RESP protocol implementation**

```shell
node --test internal/protocol/*.ts
```
