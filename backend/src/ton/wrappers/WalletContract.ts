import {
  Cell,
  Slice,
  Address,
  Builder,
  beginCell,
  TupleReader,
  Dictionary,
  contractAddress,
  ContractProvider,
  Sender,
  Contract,
  ContractABI,
  ABIType,
  ABIGetter,
  ABIReceiver,
  TupleBuilder,
  DictionaryValue,
} from '@ton/core';

export type DataSize = {
  $$type: 'DataSize';
  cells: bigint;
  bits: bigint;
  refs: bigint;
};

export function storeDataSize(src: DataSize) {
  return (builder: Builder) => {
    const b_0 = builder;
    b_0.storeInt(src.cells, 257);
    b_0.storeInt(src.bits, 257);
    b_0.storeInt(src.refs, 257);
  };
}

export function loadDataSize(slice: Slice) {
  const sc_0 = slice;
  const _cells = sc_0.loadIntBig(257);
  const _bits = sc_0.loadIntBig(257);
  const _refs = sc_0.loadIntBig(257);
  return {
    $$type: 'DataSize' as const,
    cells: _cells,
    bits: _bits,
    refs: _refs,
  };
}

export function loadTupleDataSize(source: TupleReader) {
  const _cells = source.readBigNumber();
  const _bits = source.readBigNumber();
  const _refs = source.readBigNumber();
  return {
    $$type: 'DataSize' as const,
    cells: _cells,
    bits: _bits,
    refs: _refs,
  };
}

export function loadGetterTupleDataSize(source: TupleReader) {
  const _cells = source.readBigNumber();
  const _bits = source.readBigNumber();
  const _refs = source.readBigNumber();
  return {
    $$type: 'DataSize' as const,
    cells: _cells,
    bits: _bits,
    refs: _refs,
  };
}

export function storeTupleDataSize(source: DataSize) {
  const builder = new TupleBuilder();
  builder.writeNumber(source.cells);
  builder.writeNumber(source.bits);
  builder.writeNumber(source.refs);
  return builder.build();
}

export function dictValueParserDataSize(): DictionaryValue<DataSize> {
  return {
    serialize: (src, builder) => {
      builder.storeRef(beginCell().store(storeDataSize(src)).endCell());
    },
    parse: src => {
      return loadDataSize(src.loadRef().beginParse());
    },
  };
}

export type SignedBundle = {
  $$type: 'SignedBundle';
  signature: Buffer;
  signedData: Slice;
};

export function storeSignedBundle(src: SignedBundle) {
  return (builder: Builder) => {
    const b_0 = builder;
    b_0.storeBuffer(src.signature);
    b_0.storeBuilder(src.signedData.asBuilder());
  };
}

export function loadSignedBundle(slice: Slice) {
  const sc_0 = slice;
  const _signature = sc_0.loadBuffer(64);
  const _signedData = sc_0;
  return {
    $$type: 'SignedBundle' as const,
    signature: _signature,
    signedData: _signedData,
  };
}

export function loadTupleSignedBundle(source: TupleReader) {
  const _signature = source.readBuffer();
  const _signedData = source.readCell().asSlice();
  return {
    $$type: 'SignedBundle' as const,
    signature: _signature,
    signedData: _signedData,
  };
}

export function loadGetterTupleSignedBundle(source: TupleReader) {
  const _signature = source.readBuffer();
  const _signedData = source.readCell().asSlice();
  return {
    $$type: 'SignedBundle' as const,
    signature: _signature,
    signedData: _signedData,
  };
}

export function storeTupleSignedBundle(source: SignedBundle) {
  const builder = new TupleBuilder();
  builder.writeBuffer(source.signature);
  builder.writeSlice(source.signedData.asCell());
  return builder.build();
}

export function dictValueParserSignedBundle(): DictionaryValue<SignedBundle> {
  return {
    serialize: (src, builder) => {
      builder.storeRef(beginCell().store(storeSignedBundle(src)).endCell());
    },
    parse: src => {
      return loadSignedBundle(src.loadRef().beginParse());
    },
  };
}

export type StateInit = {
  $$type: 'StateInit';
  code: Cell;
  data: Cell;
};

export function storeStateInit(src: StateInit) {
  return (builder: Builder) => {
    const b_0 = builder;
    b_0.storeRef(src.code);
    b_0.storeRef(src.data);
  };
}

export function loadStateInit(slice: Slice) {
  const sc_0 = slice;
  const _code = sc_0.loadRef();
  const _data = sc_0.loadRef();
  return { $$type: 'StateInit' as const, code: _code, data: _data };
}

export function loadTupleStateInit(source: TupleReader) {
  const _code = source.readCell();
  const _data = source.readCell();
  return { $$type: 'StateInit' as const, code: _code, data: _data };
}

export function loadGetterTupleStateInit(source: TupleReader) {
  const _code = source.readCell();
  const _data = source.readCell();
  return { $$type: 'StateInit' as const, code: _code, data: _data };
}

export function storeTupleStateInit(source: StateInit) {
  const builder = new TupleBuilder();
  builder.writeCell(source.code);
  builder.writeCell(source.data);
  return builder.build();
}

export function dictValueParserStateInit(): DictionaryValue<StateInit> {
  return {
    serialize: (src, builder) => {
      builder.storeRef(beginCell().store(storeStateInit(src)).endCell());
    },
    parse: src => {
      return loadStateInit(src.loadRef().beginParse());
    },
  };
}

export type Context = {
  $$type: 'Context';
  bounceable: boolean;
  sender: Address;
  value: bigint;
  raw: Slice;
};

export function storeContext(src: Context) {
  return (builder: Builder) => {
    const b_0 = builder;
    b_0.storeBit(src.bounceable);
    b_0.storeAddress(src.sender);
    b_0.storeInt(src.value, 257);
    b_0.storeRef(src.raw.asCell());
  };
}

export function loadContext(slice: Slice) {
  const sc_0 = slice;
  const _bounceable = sc_0.loadBit();
  const _sender = sc_0.loadAddress();
  const _value = sc_0.loadIntBig(257);
  const _raw = sc_0.loadRef().asSlice();
  return {
    $$type: 'Context' as const,
    bounceable: _bounceable,
    sender: _sender,
    value: _value,
    raw: _raw,
  };
}

export function loadTupleContext(source: TupleReader) {
  const _bounceable = source.readBoolean();
  const _sender = source.readAddress();
  const _value = source.readBigNumber();
  const _raw = source.readCell().asSlice();
  return {
    $$type: 'Context' as const,
    bounceable: _bounceable,
    sender: _sender,
    value: _value,
    raw: _raw,
  };
}

export function loadGetterTupleContext(source: TupleReader) {
  const _bounceable = source.readBoolean();
  const _sender = source.readAddress();
  const _value = source.readBigNumber();
  const _raw = source.readCell().asSlice();
  return {
    $$type: 'Context' as const,
    bounceable: _bounceable,
    sender: _sender,
    value: _value,
    raw: _raw,
  };
}

export function storeTupleContext(source: Context) {
  const builder = new TupleBuilder();
  builder.writeBoolean(source.bounceable);
  builder.writeAddress(source.sender);
  builder.writeNumber(source.value);
  builder.writeSlice(source.raw.asCell());
  return builder.build();
}

export function dictValueParserContext(): DictionaryValue<Context> {
  return {
    serialize: (src, builder) => {
      builder.storeRef(beginCell().store(storeContext(src)).endCell());
    },
    parse: src => {
      return loadContext(src.loadRef().beginParse());
    },
  };
}

export type SendParameters = {
  $$type: 'SendParameters';
  mode: bigint;
  body: Cell | null;
  code: Cell | null;
  data: Cell | null;
  value: bigint;
  to: Address;
  bounce: boolean;
};

export function storeSendParameters(src: SendParameters) {
  return (builder: Builder) => {
    const b_0 = builder;
    b_0.storeInt(src.mode, 257);
    if (src.body !== null && src.body !== undefined) {
      b_0.storeBit(true).storeRef(src.body);
    } else {
      b_0.storeBit(false);
    }
    if (src.code !== null && src.code !== undefined) {
      b_0.storeBit(true).storeRef(src.code);
    } else {
      b_0.storeBit(false);
    }
    if (src.data !== null && src.data !== undefined) {
      b_0.storeBit(true).storeRef(src.data);
    } else {
      b_0.storeBit(false);
    }
    b_0.storeInt(src.value, 257);
    b_0.storeAddress(src.to);
    b_0.storeBit(src.bounce);
  };
}

export function loadSendParameters(slice: Slice) {
  const sc_0 = slice;
  const _mode = sc_0.loadIntBig(257);
  const _body = sc_0.loadBit() ? sc_0.loadRef() : null;
  const _code = sc_0.loadBit() ? sc_0.loadRef() : null;
  const _data = sc_0.loadBit() ? sc_0.loadRef() : null;
  const _value = sc_0.loadIntBig(257);
  const _to = sc_0.loadAddress();
  const _bounce = sc_0.loadBit();
  return {
    $$type: 'SendParameters' as const,
    mode: _mode,
    body: _body,
    code: _code,
    data: _data,
    value: _value,
    to: _to,
    bounce: _bounce,
  };
}

export function loadTupleSendParameters(source: TupleReader) {
  const _mode = source.readBigNumber();
  const _body = source.readCellOpt();
  const _code = source.readCellOpt();
  const _data = source.readCellOpt();
  const _value = source.readBigNumber();
  const _to = source.readAddress();
  const _bounce = source.readBoolean();
  return {
    $$type: 'SendParameters' as const,
    mode: _mode,
    body: _body,
    code: _code,
    data: _data,
    value: _value,
    to: _to,
    bounce: _bounce,
  };
}

export function loadGetterTupleSendParameters(source: TupleReader) {
  const _mode = source.readBigNumber();
  const _body = source.readCellOpt();
  const _code = source.readCellOpt();
  const _data = source.readCellOpt();
  const _value = source.readBigNumber();
  const _to = source.readAddress();
  const _bounce = source.readBoolean();
  return {
    $$type: 'SendParameters' as const,
    mode: _mode,
    body: _body,
    code: _code,
    data: _data,
    value: _value,
    to: _to,
    bounce: _bounce,
  };
}

export function storeTupleSendParameters(source: SendParameters) {
  const builder = new TupleBuilder();
  builder.writeNumber(source.mode);
  builder.writeCell(source.body);
  builder.writeCell(source.code);
  builder.writeCell(source.data);
  builder.writeNumber(source.value);
  builder.writeAddress(source.to);
  builder.writeBoolean(source.bounce);
  return builder.build();
}

export function dictValueParserSendParameters(): DictionaryValue<SendParameters> {
  return {
    serialize: (src, builder) => {
      builder.storeRef(beginCell().store(storeSendParameters(src)).endCell());
    },
    parse: src => {
      return loadSendParameters(src.loadRef().beginParse());
    },
  };
}

export type MessageParameters = {
  $$type: 'MessageParameters';
  mode: bigint;
  body: Cell | null;
  value: bigint;
  to: Address;
  bounce: boolean;
};

export function storeMessageParameters(src: MessageParameters) {
  return (builder: Builder) => {
    const b_0 = builder;
    b_0.storeInt(src.mode, 257);
    if (src.body !== null && src.body !== undefined) {
      b_0.storeBit(true).storeRef(src.body);
    } else {
      b_0.storeBit(false);
    }
    b_0.storeInt(src.value, 257);
    b_0.storeAddress(src.to);
    b_0.storeBit(src.bounce);
  };
}

export function loadMessageParameters(slice: Slice) {
  const sc_0 = slice;
  const _mode = sc_0.loadIntBig(257);
  const _body = sc_0.loadBit() ? sc_0.loadRef() : null;
  const _value = sc_0.loadIntBig(257);
  const _to = sc_0.loadAddress();
  const _bounce = sc_0.loadBit();
  return {
    $$type: 'MessageParameters' as const,
    mode: _mode,
    body: _body,
    value: _value,
    to: _to,
    bounce: _bounce,
  };
}

export function loadTupleMessageParameters(source: TupleReader) {
  const _mode = source.readBigNumber();
  const _body = source.readCellOpt();
  const _value = source.readBigNumber();
  const _to = source.readAddress();
  const _bounce = source.readBoolean();
  return {
    $$type: 'MessageParameters' as const,
    mode: _mode,
    body: _body,
    value: _value,
    to: _to,
    bounce: _bounce,
  };
}

export function loadGetterTupleMessageParameters(source: TupleReader) {
  const _mode = source.readBigNumber();
  const _body = source.readCellOpt();
  const _value = source.readBigNumber();
  const _to = source.readAddress();
  const _bounce = source.readBoolean();
  return {
    $$type: 'MessageParameters' as const,
    mode: _mode,
    body: _body,
    value: _value,
    to: _to,
    bounce: _bounce,
  };
}

export function storeTupleMessageParameters(source: MessageParameters) {
  const builder = new TupleBuilder();
  builder.writeNumber(source.mode);
  builder.writeCell(source.body);
  builder.writeNumber(source.value);
  builder.writeAddress(source.to);
  builder.writeBoolean(source.bounce);
  return builder.build();
}

export function dictValueParserMessageParameters(): DictionaryValue<MessageParameters> {
  return {
    serialize: (src, builder) => {
      builder.storeRef(
        beginCell().store(storeMessageParameters(src)).endCell()
      );
    },
    parse: src => {
      return loadMessageParameters(src.loadRef().beginParse());
    },
  };
}

export type DeployParameters = {
  $$type: 'DeployParameters';
  mode: bigint;
  body: Cell | null;
  value: bigint;
  bounce: boolean;
  init: StateInit;
};

export function storeDeployParameters(src: DeployParameters) {
  return (builder: Builder) => {
    const b_0 = builder;
    b_0.storeInt(src.mode, 257);
    if (src.body !== null && src.body !== undefined) {
      b_0.storeBit(true).storeRef(src.body);
    } else {
      b_0.storeBit(false);
    }
    b_0.storeInt(src.value, 257);
    b_0.storeBit(src.bounce);
    b_0.store(storeStateInit(src.init));
  };
}

export function loadDeployParameters(slice: Slice) {
  const sc_0 = slice;
  const _mode = sc_0.loadIntBig(257);
  const _body = sc_0.loadBit() ? sc_0.loadRef() : null;
  const _value = sc_0.loadIntBig(257);
  const _bounce = sc_0.loadBit();
  const _init = loadStateInit(sc_0);
  return {
    $$type: 'DeployParameters' as const,
    mode: _mode,
    body: _body,
    value: _value,
    bounce: _bounce,
    init: _init,
  };
}

export function loadTupleDeployParameters(source: TupleReader) {
  const _mode = source.readBigNumber();
  const _body = source.readCellOpt();
  const _value = source.readBigNumber();
  const _bounce = source.readBoolean();
  const _init = loadTupleStateInit(source);
  return {
    $$type: 'DeployParameters' as const,
    mode: _mode,
    body: _body,
    value: _value,
    bounce: _bounce,
    init: _init,
  };
}

export function loadGetterTupleDeployParameters(source: TupleReader) {
  const _mode = source.readBigNumber();
  const _body = source.readCellOpt();
  const _value = source.readBigNumber();
  const _bounce = source.readBoolean();
  const _init = loadGetterTupleStateInit(source);
  return {
    $$type: 'DeployParameters' as const,
    mode: _mode,
    body: _body,
    value: _value,
    bounce: _bounce,
    init: _init,
  };
}

export function storeTupleDeployParameters(source: DeployParameters) {
  const builder = new TupleBuilder();
  builder.writeNumber(source.mode);
  builder.writeCell(source.body);
  builder.writeNumber(source.value);
  builder.writeBoolean(source.bounce);
  builder.writeTuple(storeTupleStateInit(source.init));
  return builder.build();
}

export function dictValueParserDeployParameters(): DictionaryValue<DeployParameters> {
  return {
    serialize: (src, builder) => {
      builder.storeRef(beginCell().store(storeDeployParameters(src)).endCell());
    },
    parse: src => {
      return loadDeployParameters(src.loadRef().beginParse());
    },
  };
}

export type StdAddress = {
  $$type: 'StdAddress';
  workchain: bigint;
  address: bigint;
};

export function storeStdAddress(src: StdAddress) {
  return (builder: Builder) => {
    const b_0 = builder;
    b_0.storeInt(src.workchain, 8);
    b_0.storeUint(src.address, 256);
  };
}

export function loadStdAddress(slice: Slice) {
  const sc_0 = slice;
  const _workchain = sc_0.loadIntBig(8);
  const _address = sc_0.loadUintBig(256);
  return {
    $$type: 'StdAddress' as const,
    workchain: _workchain,
    address: _address,
  };
}

export function loadTupleStdAddress(source: TupleReader) {
  const _workchain = source.readBigNumber();
  const _address = source.readBigNumber();
  return {
    $$type: 'StdAddress' as const,
    workchain: _workchain,
    address: _address,
  };
}

export function loadGetterTupleStdAddress(source: TupleReader) {
  const _workchain = source.readBigNumber();
  const _address = source.readBigNumber();
  return {
    $$type: 'StdAddress' as const,
    workchain: _workchain,
    address: _address,
  };
}

export function storeTupleStdAddress(source: StdAddress) {
  const builder = new TupleBuilder();
  builder.writeNumber(source.workchain);
  builder.writeNumber(source.address);
  return builder.build();
}

export function dictValueParserStdAddress(): DictionaryValue<StdAddress> {
  return {
    serialize: (src, builder) => {
      builder.storeRef(beginCell().store(storeStdAddress(src)).endCell());
    },
    parse: src => {
      return loadStdAddress(src.loadRef().beginParse());
    },
  };
}

export type VarAddress = {
  $$type: 'VarAddress';
  workchain: bigint;
  address: Slice;
};

export function storeVarAddress(src: VarAddress) {
  return (builder: Builder) => {
    const b_0 = builder;
    b_0.storeInt(src.workchain, 32);
    b_0.storeRef(src.address.asCell());
  };
}

export function loadVarAddress(slice: Slice) {
  const sc_0 = slice;
  const _workchain = sc_0.loadIntBig(32);
  const _address = sc_0.loadRef().asSlice();
  return {
    $$type: 'VarAddress' as const,
    workchain: _workchain,
    address: _address,
  };
}

export function loadTupleVarAddress(source: TupleReader) {
  const _workchain = source.readBigNumber();
  const _address = source.readCell().asSlice();
  return {
    $$type: 'VarAddress' as const,
    workchain: _workchain,
    address: _address,
  };
}

export function loadGetterTupleVarAddress(source: TupleReader) {
  const _workchain = source.readBigNumber();
  const _address = source.readCell().asSlice();
  return {
    $$type: 'VarAddress' as const,
    workchain: _workchain,
    address: _address,
  };
}

export function storeTupleVarAddress(source: VarAddress) {
  const builder = new TupleBuilder();
  builder.writeNumber(source.workchain);
  builder.writeSlice(source.address.asCell());
  return builder.build();
}

export function dictValueParserVarAddress(): DictionaryValue<VarAddress> {
  return {
    serialize: (src, builder) => {
      builder.storeRef(beginCell().store(storeVarAddress(src)).endCell());
    },
    parse: src => {
      return loadVarAddress(src.loadRef().beginParse());
    },
  };
}

export type BasechainAddress = {
  $$type: 'BasechainAddress';
  hash: bigint | null;
};

export function storeBasechainAddress(src: BasechainAddress) {
  return (builder: Builder) => {
    const b_0 = builder;
    if (src.hash !== null && src.hash !== undefined) {
      b_0.storeBit(true).storeInt(src.hash, 257);
    } else {
      b_0.storeBit(false);
    }
  };
}

export function loadBasechainAddress(slice: Slice) {
  const sc_0 = slice;
  const _hash = sc_0.loadBit() ? sc_0.loadIntBig(257) : null;
  return { $$type: 'BasechainAddress' as const, hash: _hash };
}

export function loadTupleBasechainAddress(source: TupleReader) {
  const _hash = source.readBigNumberOpt();
  return { $$type: 'BasechainAddress' as const, hash: _hash };
}

export function loadGetterTupleBasechainAddress(source: TupleReader) {
  const _hash = source.readBigNumberOpt();
  return { $$type: 'BasechainAddress' as const, hash: _hash };
}

export function storeTupleBasechainAddress(source: BasechainAddress) {
  const builder = new TupleBuilder();
  builder.writeNumber(source.hash);
  return builder.build();
}

export function dictValueParserBasechainAddress(): DictionaryValue<BasechainAddress> {
  return {
    serialize: (src, builder) => {
      builder.storeRef(beginCell().store(storeBasechainAddress(src)).endCell());
    },
    parse: src => {
      return loadBasechainAddress(src.loadRef().beginParse());
    },
  };
}

export type Deploy = {
  $$type: 'Deploy';
  queryId: bigint;
};

export function storeDeploy(src: Deploy) {
  return (builder: Builder) => {
    const b_0 = builder;
    b_0.storeUint(2490013878, 32);
    b_0.storeUint(src.queryId, 64);
  };
}

export function loadDeploy(slice: Slice) {
  const sc_0 = slice;
  if (sc_0.loadUint(32) !== 2490013878) {
    throw Error('Invalid prefix');
  }
  const _queryId = sc_0.loadUintBig(64);
  return { $$type: 'Deploy' as const, queryId: _queryId };
}

export function loadTupleDeploy(source: TupleReader) {
  const _queryId = source.readBigNumber();
  return { $$type: 'Deploy' as const, queryId: _queryId };
}

export function loadGetterTupleDeploy(source: TupleReader) {
  const _queryId = source.readBigNumber();
  return { $$type: 'Deploy' as const, queryId: _queryId };
}

export function storeTupleDeploy(source: Deploy) {
  const builder = new TupleBuilder();
  builder.writeNumber(source.queryId);
  return builder.build();
}

export function dictValueParserDeploy(): DictionaryValue<Deploy> {
  return {
    serialize: (src, builder) => {
      builder.storeRef(beginCell().store(storeDeploy(src)).endCell());
    },
    parse: src => {
      return loadDeploy(src.loadRef().beginParse());
    },
  };
}

export type DeployOk = {
  $$type: 'DeployOk';
  queryId: bigint;
};

export function storeDeployOk(src: DeployOk) {
  return (builder: Builder) => {
    const b_0 = builder;
    b_0.storeUint(2952335191, 32);
    b_0.storeUint(src.queryId, 64);
  };
}

export function loadDeployOk(slice: Slice) {
  const sc_0 = slice;
  if (sc_0.loadUint(32) !== 2952335191) {
    throw Error('Invalid prefix');
  }
  const _queryId = sc_0.loadUintBig(64);
  return { $$type: 'DeployOk' as const, queryId: _queryId };
}

export function loadTupleDeployOk(source: TupleReader) {
  const _queryId = source.readBigNumber();
  return { $$type: 'DeployOk' as const, queryId: _queryId };
}

export function loadGetterTupleDeployOk(source: TupleReader) {
  const _queryId = source.readBigNumber();
  return { $$type: 'DeployOk' as const, queryId: _queryId };
}

export function storeTupleDeployOk(source: DeployOk) {
  const builder = new TupleBuilder();
  builder.writeNumber(source.queryId);
  return builder.build();
}

export function dictValueParserDeployOk(): DictionaryValue<DeployOk> {
  return {
    serialize: (src, builder) => {
      builder.storeRef(beginCell().store(storeDeployOk(src)).endCell());
    },
    parse: src => {
      return loadDeployOk(src.loadRef().beginParse());
    },
  };
}

export type FactoryDeploy = {
  $$type: 'FactoryDeploy';
  queryId: bigint;
  cashback: Address;
};

export function storeFactoryDeploy(src: FactoryDeploy) {
  return (builder: Builder) => {
    const b_0 = builder;
    b_0.storeUint(1829761339, 32);
    b_0.storeUint(src.queryId, 64);
    b_0.storeAddress(src.cashback);
  };
}

export function loadFactoryDeploy(slice: Slice) {
  const sc_0 = slice;
  if (sc_0.loadUint(32) !== 1829761339) {
    throw Error('Invalid prefix');
  }
  const _queryId = sc_0.loadUintBig(64);
  const _cashback = sc_0.loadAddress();
  return {
    $$type: 'FactoryDeploy' as const,
    queryId: _queryId,
    cashback: _cashback,
  };
}

export function loadTupleFactoryDeploy(source: TupleReader) {
  const _queryId = source.readBigNumber();
  const _cashback = source.readAddress();
  return {
    $$type: 'FactoryDeploy' as const,
    queryId: _queryId,
    cashback: _cashback,
  };
}

export function loadGetterTupleFactoryDeploy(source: TupleReader) {
  const _queryId = source.readBigNumber();
  const _cashback = source.readAddress();
  return {
    $$type: 'FactoryDeploy' as const,
    queryId: _queryId,
    cashback: _cashback,
  };
}

export function storeTupleFactoryDeploy(source: FactoryDeploy) {
  const builder = new TupleBuilder();
  builder.writeNumber(source.queryId);
  builder.writeAddress(source.cashback);
  return builder.build();
}

export function dictValueParserFactoryDeploy(): DictionaryValue<FactoryDeploy> {
  return {
    serialize: (src, builder) => {
      builder.storeRef(beginCell().store(storeFactoryDeploy(src)).endCell());
    },
    parse: src => {
      return loadFactoryDeploy(src.loadRef().beginParse());
    },
  };
}

export type Deposit = {
  $$type: 'Deposit';
};

export function storeDeposit(_src: Deposit) {
  return (builder: Builder) => {
    const b_0 = builder;
    b_0.storeUint(1, 32);
  };
}

export function loadDeposit(slice: Slice) {
  const sc_0 = slice;
  if (sc_0.loadUint(32) !== 1) {
    throw Error('Invalid prefix');
  }
  return { $$type: 'Deposit' as const };
}

export function loadTupleDeposit(_source: TupleReader) {
  return { $$type: 'Deposit' as const };
}

export function loadGetterTupleDeposit(_source: TupleReader) {
  return { $$type: 'Deposit' as const };
}

export function storeTupleDeposit(_source: Deposit) {
  const builder = new TupleBuilder();
  return builder.build();
}

export function dictValueParserDeposit(): DictionaryValue<Deposit> {
  return {
    serialize: (src, builder) => {
      builder.storeRef(beginCell().store(storeDeposit(src)).endCell());
    },
    parse: src => {
      return loadDeposit(src.loadRef().beginParse());
    },
  };
}

export type Withdraw = {
  $$type: 'Withdraw';
  amount: bigint;
};

export function storeWithdraw(src: Withdraw) {
  return (builder: Builder) => {
    const b_0 = builder;
    b_0.storeUint(2, 32);
    b_0.storeCoins(src.amount);
  };
}

export function loadWithdraw(slice: Slice) {
  const sc_0 = slice;
  if (sc_0.loadUint(32) !== 2) {
    throw Error('Invalid prefix');
  }
  const _amount = sc_0.loadCoins();
  return { $$type: 'Withdraw' as const, amount: _amount };
}

export function loadTupleWithdraw(source: TupleReader) {
  const _amount = source.readBigNumber();
  return { $$type: 'Withdraw' as const, amount: _amount };
}

export function loadGetterTupleWithdraw(source: TupleReader) {
  const _amount = source.readBigNumber();
  return { $$type: 'Withdraw' as const, amount: _amount };
}

export function storeTupleWithdraw(source: Withdraw) {
  const builder = new TupleBuilder();
  builder.writeNumber(source.amount);
  return builder.build();
}

export function dictValueParserWithdraw(): DictionaryValue<Withdraw> {
  return {
    serialize: (src, builder) => {
      builder.storeRef(beginCell().store(storeWithdraw(src)).endCell());
    },
    parse: src => {
      return loadWithdraw(src.loadRef().beginParse());
    },
  };
}

export type AwardJetton = {
  $$type: 'AwardJetton';
  user: Address;
  amount: bigint;
};

export function storeAwardJetton(src: AwardJetton) {
  return (builder: Builder) => {
    const b_0 = builder;
    b_0.storeUint(3, 32);
    b_0.storeAddress(src.user);
    b_0.storeCoins(src.amount);
  };
}

export function loadAwardJetton(slice: Slice) {
  const sc_0 = slice;
  if (sc_0.loadUint(32) !== 3) {
    throw Error('Invalid prefix');
  }
  const _user = sc_0.loadAddress();
  const _amount = sc_0.loadCoins();
  return { $$type: 'AwardJetton' as const, user: _user, amount: _amount };
}

export function loadTupleAwardJetton(source: TupleReader) {
  const _user = source.readAddress();
  const _amount = source.readBigNumber();
  return { $$type: 'AwardJetton' as const, user: _user, amount: _amount };
}

export function loadGetterTupleAwardJetton(source: TupleReader) {
  const _user = source.readAddress();
  const _amount = source.readBigNumber();
  return { $$type: 'AwardJetton' as const, user: _user, amount: _amount };
}

export function storeTupleAwardJetton(source: AwardJetton) {
  const builder = new TupleBuilder();
  builder.writeAddress(source.user);
  builder.writeNumber(source.amount);
  return builder.build();
}

export function dictValueParserAwardJetton(): DictionaryValue<AwardJetton> {
  return {
    serialize: (src, builder) => {
      builder.storeRef(beginCell().store(storeAwardJetton(src)).endCell());
    },
    parse: src => {
      return loadAwardJetton(src.loadRef().beginParse());
    },
  };
}

export type Pause = {
  $$type: 'Pause';
  flag: boolean;
};

export function storePause(src: Pause) {
  return (builder: Builder) => {
    const b_0 = builder;
    b_0.storeUint(4, 32);
    b_0.storeBit(src.flag);
  };
}

export function loadPause(slice: Slice) {
  const sc_0 = slice;
  if (sc_0.loadUint(32) !== 4) {
    throw Error('Invalid prefix');
  }
  const _flag = sc_0.loadBit();
  return { $$type: 'Pause' as const, flag: _flag };
}

export function loadTuplePause(source: TupleReader) {
  const _flag = source.readBoolean();
  return { $$type: 'Pause' as const, flag: _flag };
}

export function loadGetterTuplePause(source: TupleReader) {
  const _flag = source.readBoolean();
  return { $$type: 'Pause' as const, flag: _flag };
}

export function storeTuplePause(source: Pause) {
  const builder = new TupleBuilder();
  builder.writeBoolean(source.flag);
  return builder.build();
}

export function dictValueParserPause(): DictionaryValue<Pause> {
  return {
    serialize: (src, builder) => {
      builder.storeRef(beginCell().store(storePause(src)).endCell());
    },
    parse: src => {
      return loadPause(src.loadRef().beginParse());
    },
  };
}

export type EmergencyWithdraw = {
  $$type: 'EmergencyWithdraw';
  to: Address;
  amount: bigint;
};

export function storeEmergencyWithdraw(src: EmergencyWithdraw) {
  return (builder: Builder) => {
    const b_0 = builder;
    b_0.storeUint(5, 32);
    b_0.storeAddress(src.to);
    b_0.storeCoins(src.amount);
  };
}

export function loadEmergencyWithdraw(slice: Slice) {
  const sc_0 = slice;
  if (sc_0.loadUint(32) !== 5) {
    throw Error('Invalid prefix');
  }
  const _to = sc_0.loadAddress();
  const _amount = sc_0.loadCoins();
  return { $$type: 'EmergencyWithdraw' as const, to: _to, amount: _amount };
}

export function loadTupleEmergencyWithdraw(source: TupleReader) {
  const _to = source.readAddress();
  const _amount = source.readBigNumber();
  return { $$type: 'EmergencyWithdraw' as const, to: _to, amount: _amount };
}

export function loadGetterTupleEmergencyWithdraw(source: TupleReader) {
  const _to = source.readAddress();
  const _amount = source.readBigNumber();
  return { $$type: 'EmergencyWithdraw' as const, to: _to, amount: _amount };
}

export function storeTupleEmergencyWithdraw(source: EmergencyWithdraw) {
  const builder = new TupleBuilder();
  builder.writeAddress(source.to);
  builder.writeNumber(source.amount);
  return builder.build();
}

export function dictValueParserEmergencyWithdraw(): DictionaryValue<EmergencyWithdraw> {
  return {
    serialize: (src, builder) => {
      builder.storeRef(
        beginCell().store(storeEmergencyWithdraw(src)).endCell()
      );
    },
    parse: src => {
      return loadEmergencyWithdraw(src.loadRef().beginParse());
    },
  };
}

export type WalletContract$Data = {
  $$type: 'WalletContract$Data';
  owner: Address;
  paused: boolean;
  balances: Dictionary<Address, bigint>;
  jettonMaster: Address;
  withdrawFeeBps: bigint;
};

export function storeWalletContract$Data(src: WalletContract$Data) {
  return (builder: Builder) => {
    const b_0 = builder;
    b_0.storeAddress(src.owner);
    b_0.storeBit(src.paused);
    b_0.storeDict(
      src.balances,
      Dictionary.Keys.Address(),
      Dictionary.Values.BigVarUint(4)
    );
    b_0.storeAddress(src.jettonMaster);
    b_0.storeInt(src.withdrawFeeBps, 257);
  };
}

export function loadWalletContract$Data(slice: Slice) {
  const sc_0 = slice;
  const _owner = sc_0.loadAddress();
  const _paused = sc_0.loadBit();
  const _balances = Dictionary.load(
    Dictionary.Keys.Address(),
    Dictionary.Values.BigVarUint(4),
    sc_0
  );
  const _jettonMaster = sc_0.loadAddress();
  const _withdrawFeeBps = sc_0.loadIntBig(257);
  return {
    $$type: 'WalletContract$Data' as const,
    owner: _owner,
    paused: _paused,
    balances: _balances,
    jettonMaster: _jettonMaster,
    withdrawFeeBps: _withdrawFeeBps,
  };
}

export function loadTupleWalletContract$Data(source: TupleReader) {
  const _owner = source.readAddress();
  const _paused = source.readBoolean();
  const _balances = Dictionary.loadDirect(
    Dictionary.Keys.Address(),
    Dictionary.Values.BigVarUint(4),
    source.readCellOpt()
  );
  const _jettonMaster = source.readAddress();
  const _withdrawFeeBps = source.readBigNumber();
  return {
    $$type: 'WalletContract$Data' as const,
    owner: _owner,
    paused: _paused,
    balances: _balances,
    jettonMaster: _jettonMaster,
    withdrawFeeBps: _withdrawFeeBps,
  };
}

export function loadGetterTupleWalletContract$Data(source: TupleReader) {
  const _owner = source.readAddress();
  const _paused = source.readBoolean();
  const _balances = Dictionary.loadDirect(
    Dictionary.Keys.Address(),
    Dictionary.Values.BigVarUint(4),
    source.readCellOpt()
  );
  const _jettonMaster = source.readAddress();
  const _withdrawFeeBps = source.readBigNumber();
  return {
    $$type: 'WalletContract$Data' as const,
    owner: _owner,
    paused: _paused,
    balances: _balances,
    jettonMaster: _jettonMaster,
    withdrawFeeBps: _withdrawFeeBps,
  };
}

export function storeTupleWalletContract$Data(source: WalletContract$Data) {
  const builder = new TupleBuilder();
  builder.writeAddress(source.owner);
  builder.writeBoolean(source.paused);
  builder.writeCell(
    source.balances.size > 0
      ? beginCell()
          .storeDictDirect(
            source.balances,
            Dictionary.Keys.Address(),
            Dictionary.Values.BigVarUint(4)
          )
          .endCell()
      : null
  );
  builder.writeAddress(source.jettonMaster);
  builder.writeNumber(source.withdrawFeeBps);
  return builder.build();
}

export function dictValueParserWalletContract$Data(): DictionaryValue<WalletContract$Data> {
  return {
    serialize: (src, builder) => {
      builder.storeRef(
        beginCell().store(storeWalletContract$Data(src)).endCell()
      );
    },
    parse: src => {
      return loadWalletContract$Data(src.loadRef().beginParse());
    },
  };
}

type WalletContract_init_args = {
  $$type: 'WalletContract_init_args';
  ownerAddr: Address;
  jettonMasterAddr: Address;
  withdrawFeeBps: bigint;
};

function initWalletContract_init_args(src: WalletContract_init_args) {
  return (builder: Builder) => {
    const b_0 = builder;
    b_0.storeAddress(src.ownerAddr);
    b_0.storeAddress(src.jettonMasterAddr);
    b_0.storeInt(src.withdrawFeeBps, 257);
  };
}

async function WalletContract_init(
  ownerAddr: Address,
  jettonMasterAddr: Address,
  withdrawFeeBps: bigint
) {
  const __code = Cell.fromHex(
    'b5ee9c724102100100034600022cff008e88f4a413f4bcf2c80bed53208e8130e1ed43d901090202710204016dbfd49f6a268690000c708fd2069007a027d20408080eb802aa0360ac7097d207d20408080eb802a9001e8ac38013681712a826d9e3628c03003a81010b240259f40a6fa193fa003092306de2206e923070e0206ef2d08002012005070169b8e89ed44d0d200018e11fa40d200f404fa40810101d70055406c158e12fa40fa40810101d700552003d15870026d02e2db3c6c518060002240169bacdeed44d0d200018e11fa40d200f404fa40810101d70055406c158e12fa40fa40810101d700552003d15870026d02e2db3c6c5180800022304c601d072d721d200d200fa4021103450666f04f86102f862ed44d0d200018e11fa40d200f404fa40810101d70055406c158e12fa40fa40810101d700552003d15870026d02e206925f06e004d70d1ff2e08221c001e30221c002e30221c003e30221c0040a0b0d0e00da5b8200a06b22b3f2f4f842f8416f24135f038200af2321c200f2f42281010b2359f40a6fa193fa003092306de270216eb39630206ef2d0809131e281010b02a012206e953059f4593098c801fa024133f441e24034c87f01ca0055405045ce12ca00f400ce810101cf00c9ed5401fe31fa00308200a06b23b3f2f4f842811ebe22c200f2f42281010b2259f40a6fa193fa003092306de270216eb39630206ef2d0809131e28200c6135313bef2f45327a8812710a9045330a10281010b05a145405230206e953059f4593098c801fa024133f441e203726d40037fc8cf8580ca00cf8440ce01fa02806acf40f4000c0088c901fb0020c2008e1e5230726d40037fc8cf8580ca00cf8440ce01fa02806acf40f400c901fb009130e24034c87f01ca0055405045ce12ca00f400ce810101cf00c9ed54004c5b8200e594f84224c705f2f44034c87f01ca0055405045ce12ca00f400ce810101cf00c9ed5401728e2c316c12d200308200e594f84224c705f2f4443302c87f01ca0055405045ce12ca00f400ce810101cf00c9ed54e001c005e3025f06f2c0820f009afa40fa00308200e594f84226c705f2f482008ab324f2f4726d40037fc8cf8580ca00cf8440ce01fa02806acf40f400c901fb004034c87f01ca0055405045ce12ca00f400ce810101cf00c9ed549586cb9f'
  );
  const builder = beginCell();
  builder.storeUint(0, 1);
  initWalletContract_init_args({
    $$type: 'WalletContract_init_args',
    ownerAddr,
    jettonMasterAddr,
    withdrawFeeBps,
  })(builder);
  const __data = builder.endCell();
  return { code: __code, data: __data };
}

export const WalletContract_errors = {
  2: { message: 'Stack underflow' },
  3: { message: 'Stack overflow' },
  4: { message: 'Integer overflow' },
  5: { message: 'Integer out of expected range' },
  6: { message: 'Invalid opcode' },
  7: { message: 'Type check error' },
  8: { message: 'Cell overflow' },
  9: { message: 'Cell underflow' },
  10: { message: 'Dictionary error' },
  11: { message: "'Unknown' error" },
  12: { message: 'Fatal error' },
  13: { message: 'Out of gas error' },
  14: { message: 'Virtualization error' },
  32: { message: 'Action list is invalid' },
  33: { message: 'Action list is too long' },
  34: { message: 'Action is invalid or not supported' },
  35: { message: 'Invalid source address in outbound message' },
  36: { message: 'Invalid destination address in outbound message' },
  37: { message: 'Not enough Toncoin' },
  38: { message: 'Not enough extra currencies' },
  39: { message: 'Outbound message does not fit into a cell after rewriting' },
  40: { message: 'Cannot process a message' },
  41: { message: 'Library reference is null' },
  42: { message: 'Library change action error' },
  43: {
    message:
      'Exceeded maximum number of cells in the library or the maximum depth of the Merkle tree',
  },
  50: { message: 'Account state size exceeded limits' },
  128: { message: 'Null reference exception' },
  129: { message: 'Invalid serialization prefix' },
  130: { message: 'Invalid incoming message' },
  131: { message: 'Constraints error' },
  132: { message: 'Access denied' },
  133: { message: 'Contract stopped' },
  134: { message: 'Invalid argument' },
  135: { message: 'Code of a contract was not found' },
  136: { message: 'Invalid standard address' },
  138: { message: 'Not a basechain address' },
  7870: { message: 'zero withdraw' },
  35507: { message: 'not paused' },
  41067: { message: 'paused' },
  44835: { message: 'zero deposit' },
  50707: { message: 'insufficient' },
  58772: { message: 'only owner' },
} as const;

export const WalletContract_errors_backward = {
  'Stack underflow': 2,
  'Stack overflow': 3,
  'Integer overflow': 4,
  'Integer out of expected range': 5,
  'Invalid opcode': 6,
  'Type check error': 7,
  'Cell overflow': 8,
  'Cell underflow': 9,
  'Dictionary error': 10,
  "'Unknown' error": 11,
  'Fatal error': 12,
  'Out of gas error': 13,
  'Virtualization error': 14,
  'Action list is invalid': 32,
  'Action list is too long': 33,
  'Action is invalid or not supported': 34,
  'Invalid source address in outbound message': 35,
  'Invalid destination address in outbound message': 36,
  'Not enough Toncoin': 37,
  'Not enough extra currencies': 38,
  'Outbound message does not fit into a cell after rewriting': 39,
  'Cannot process a message': 40,
  'Library reference is null': 41,
  'Library change action error': 42,
  'Exceeded maximum number of cells in the library or the maximum depth of the Merkle tree': 43,
  'Account state size exceeded limits': 50,
  'Null reference exception': 128,
  'Invalid serialization prefix': 129,
  'Invalid incoming message': 130,
  'Constraints error': 131,
  'Access denied': 132,
  'Contract stopped': 133,
  'Invalid argument': 134,
  'Code of a contract was not found': 135,
  'Invalid standard address': 136,
  'Not a basechain address': 138,
  'zero withdraw': 7870,
  'not paused': 35507,
  paused: 41067,
  'zero deposit': 44835,
  insufficient: 50707,
  'only owner': 58772,
} as const;

const WalletContract_types: ABIType[] = [
  {
    name: 'DataSize',
    header: null,
    fields: [
      {
        name: 'cells',
        type: { kind: 'simple', type: 'int', optional: false, format: 257 },
      },
      {
        name: 'bits',
        type: { kind: 'simple', type: 'int', optional: false, format: 257 },
      },
      {
        name: 'refs',
        type: { kind: 'simple', type: 'int', optional: false, format: 257 },
      },
    ],
  },
  {
    name: 'SignedBundle',
    header: null,
    fields: [
      {
        name: 'signature',
        type: {
          kind: 'simple',
          type: 'fixed-bytes',
          optional: false,
          format: 64,
        },
      },
      {
        name: 'signedData',
        type: {
          kind: 'simple',
          type: 'slice',
          optional: false,
          format: 'remainder',
        },
      },
    ],
  },
  {
    name: 'StateInit',
    header: null,
    fields: [
      { name: 'code', type: { kind: 'simple', type: 'cell', optional: false } },
      { name: 'data', type: { kind: 'simple', type: 'cell', optional: false } },
    ],
  },
  {
    name: 'Context',
    header: null,
    fields: [
      {
        name: 'bounceable',
        type: { kind: 'simple', type: 'bool', optional: false },
      },
      {
        name: 'sender',
        type: { kind: 'simple', type: 'address', optional: false },
      },
      {
        name: 'value',
        type: { kind: 'simple', type: 'int', optional: false, format: 257 },
      },
      { name: 'raw', type: { kind: 'simple', type: 'slice', optional: false } },
    ],
  },
  {
    name: 'SendParameters',
    header: null,
    fields: [
      {
        name: 'mode',
        type: { kind: 'simple', type: 'int', optional: false, format: 257 },
      },
      { name: 'body', type: { kind: 'simple', type: 'cell', optional: true } },
      { name: 'code', type: { kind: 'simple', type: 'cell', optional: true } },
      { name: 'data', type: { kind: 'simple', type: 'cell', optional: true } },
      {
        name: 'value',
        type: { kind: 'simple', type: 'int', optional: false, format: 257 },
      },
      {
        name: 'to',
        type: { kind: 'simple', type: 'address', optional: false },
      },
      {
        name: 'bounce',
        type: { kind: 'simple', type: 'bool', optional: false },
      },
    ],
  },
  {
    name: 'MessageParameters',
    header: null,
    fields: [
      {
        name: 'mode',
        type: { kind: 'simple', type: 'int', optional: false, format: 257 },
      },
      { name: 'body', type: { kind: 'simple', type: 'cell', optional: true } },
      {
        name: 'value',
        type: { kind: 'simple', type: 'int', optional: false, format: 257 },
      },
      {
        name: 'to',
        type: { kind: 'simple', type: 'address', optional: false },
      },
      {
        name: 'bounce',
        type: { kind: 'simple', type: 'bool', optional: false },
      },
    ],
  },
  {
    name: 'DeployParameters',
    header: null,
    fields: [
      {
        name: 'mode',
        type: { kind: 'simple', type: 'int', optional: false, format: 257 },
      },
      { name: 'body', type: { kind: 'simple', type: 'cell', optional: true } },
      {
        name: 'value',
        type: { kind: 'simple', type: 'int', optional: false, format: 257 },
      },
      {
        name: 'bounce',
        type: { kind: 'simple', type: 'bool', optional: false },
      },
      {
        name: 'init',
        type: { kind: 'simple', type: 'StateInit', optional: false },
      },
    ],
  },
  {
    name: 'StdAddress',
    header: null,
    fields: [
      {
        name: 'workchain',
        type: { kind: 'simple', type: 'int', optional: false, format: 8 },
      },
      {
        name: 'address',
        type: { kind: 'simple', type: 'uint', optional: false, format: 256 },
      },
    ],
  },
  {
    name: 'VarAddress',
    header: null,
    fields: [
      {
        name: 'workchain',
        type: { kind: 'simple', type: 'int', optional: false, format: 32 },
      },
      {
        name: 'address',
        type: { kind: 'simple', type: 'slice', optional: false },
      },
    ],
  },
  {
    name: 'BasechainAddress',
    header: null,
    fields: [
      {
        name: 'hash',
        type: { kind: 'simple', type: 'int', optional: true, format: 257 },
      },
    ],
  },
  {
    name: 'Deploy',
    header: 2490013878,
    fields: [
      {
        name: 'queryId',
        type: { kind: 'simple', type: 'uint', optional: false, format: 64 },
      },
    ],
  },
  {
    name: 'DeployOk',
    header: 2952335191,
    fields: [
      {
        name: 'queryId',
        type: { kind: 'simple', type: 'uint', optional: false, format: 64 },
      },
    ],
  },
  {
    name: 'FactoryDeploy',
    header: 1829761339,
    fields: [
      {
        name: 'queryId',
        type: { kind: 'simple', type: 'uint', optional: false, format: 64 },
      },
      {
        name: 'cashback',
        type: { kind: 'simple', type: 'address', optional: false },
      },
    ],
  },
  { name: 'Deposit', header: 1, fields: [] },
  {
    name: 'Withdraw',
    header: 2,
    fields: [
      {
        name: 'amount',
        type: {
          kind: 'simple',
          type: 'uint',
          optional: false,
          format: 'coins',
        },
      },
    ],
  },
  {
    name: 'AwardJetton',
    header: 3,
    fields: [
      {
        name: 'user',
        type: { kind: 'simple', type: 'address', optional: false },
      },
      {
        name: 'amount',
        type: {
          kind: 'simple',
          type: 'uint',
          optional: false,
          format: 'coins',
        },
      },
    ],
  },
  {
    name: 'Pause',
    header: 4,
    fields: [
      { name: 'flag', type: { kind: 'simple', type: 'bool', optional: false } },
    ],
  },
  {
    name: 'EmergencyWithdraw',
    header: 5,
    fields: [
      {
        name: 'to',
        type: { kind: 'simple', type: 'address', optional: false },
      },
      {
        name: 'amount',
        type: {
          kind: 'simple',
          type: 'uint',
          optional: false,
          format: 'coins',
        },
      },
    ],
  },
  {
    name: 'WalletContract$Data',
    header: null,
    fields: [
      {
        name: 'owner',
        type: { kind: 'simple', type: 'address', optional: false },
      },
      {
        name: 'paused',
        type: { kind: 'simple', type: 'bool', optional: false },
      },
      {
        name: 'balances',
        type: {
          kind: 'dict',
          key: 'address',
          value: 'uint',
          valueFormat: 'coins',
        },
      },
      {
        name: 'jettonMaster',
        type: { kind: 'simple', type: 'address', optional: false },
      },
      {
        name: 'withdrawFeeBps',
        type: { kind: 'simple', type: 'int', optional: false, format: 257 },
      },
    ],
  },
];

const WalletContract_opcodes = {
  Deploy: 2490013878,
  DeployOk: 2952335191,
  FactoryDeploy: 1829761339,
  Deposit: 1,
  Withdraw: 2,
  AwardJetton: 3,
  Pause: 4,
  EmergencyWithdraw: 5,
};

const WalletContract_getters: ABIGetter[] = [
  {
    name: 'balanceOf',
    methodId: 96915,
    arguments: [
      {
        name: 'user',
        type: { kind: 'simple', type: 'address', optional: false },
      },
    ],
    returnType: { kind: 'simple', type: 'int', optional: false, format: 257 },
  },
  {
    name: 'isPaused',
    methodId: 126174,
    arguments: [],
    returnType: { kind: 'simple', type: 'bool', optional: false },
  },
  {
    name: 'getOwner',
    methodId: 102025,
    arguments: [],
    returnType: { kind: 'simple', type: 'address', optional: false },
  },
];

export const WalletContract_getterMapping: { [key: string]: string } = {
  balanceOf: 'getBalanceOf',
  isPaused: 'getIsPaused',
  getOwner: 'getGetOwner',
};

const WalletContract_receivers: ABIReceiver[] = [
  { receiver: 'internal', message: { kind: 'typed', type: 'Deposit' } },
  { receiver: 'internal', message: { kind: 'typed', type: 'Withdraw' } },
  { receiver: 'internal', message: { kind: 'typed', type: 'AwardJetton' } },
  { receiver: 'internal', message: { kind: 'typed', type: 'Pause' } },
  {
    receiver: 'internal',
    message: { kind: 'typed', type: 'EmergencyWithdraw' },
  },
];

export class WalletContract implements Contract {
  public static readonly storageReserve = 0n;
  public static readonly errors = WalletContract_errors_backward;
  public static readonly opcodes = WalletContract_opcodes;

  static async init(
    ownerAddr: Address,
    jettonMasterAddr: Address,
    withdrawFeeBps: bigint
  ) {
    return await WalletContract_init(
      ownerAddr,
      jettonMasterAddr,
      withdrawFeeBps
    );
  }

  static async fromInit(
    ownerAddr: Address,
    jettonMasterAddr: Address,
    withdrawFeeBps: bigint
  ) {
    const __gen_init = await WalletContract_init(
      ownerAddr,
      jettonMasterAddr,
      withdrawFeeBps
    );
    const address = contractAddress(0, __gen_init);
    return new WalletContract(address, __gen_init);
  }

  static fromAddress(address: Address) {
    return new WalletContract(address);
  }

  readonly address: Address;
  readonly init?: { code: Cell; data: Cell };
  readonly abi: ContractABI = {
    types: WalletContract_types,
    getters: WalletContract_getters,
    receivers: WalletContract_receivers,
    errors: WalletContract_errors,
  };

  constructor(address: Address, init?: { code: Cell; data: Cell }) {
    this.address = address;
    this.init = init;
  }

  async send(
    provider: ContractProvider,
    via: Sender,
    args: { value: bigint; bounce?: boolean | null | undefined },
    message: Deposit | Withdraw | AwardJetton | Pause | EmergencyWithdraw
  ) {
    let body: Cell | null = null;
    if (
      message &&
      typeof message === 'object' &&
      !(message instanceof Slice) &&
      message.$$type === 'Deposit'
    ) {
      body = beginCell().store(storeDeposit(message)).endCell();
    }
    if (
      message &&
      typeof message === 'object' &&
      !(message instanceof Slice) &&
      message.$$type === 'Withdraw'
    ) {
      body = beginCell().store(storeWithdraw(message)).endCell();
    }
    if (
      message &&
      typeof message === 'object' &&
      !(message instanceof Slice) &&
      message.$$type === 'AwardJetton'
    ) {
      body = beginCell().store(storeAwardJetton(message)).endCell();
    }
    if (
      message &&
      typeof message === 'object' &&
      !(message instanceof Slice) &&
      message.$$type === 'Pause'
    ) {
      body = beginCell().store(storePause(message)).endCell();
    }
    if (
      message &&
      typeof message === 'object' &&
      !(message instanceof Slice) &&
      message.$$type === 'EmergencyWithdraw'
    ) {
      body = beginCell().store(storeEmergencyWithdraw(message)).endCell();
    }
    if (body === null) {
      throw new Error('Invalid message type');
    }

    await provider.internal(via, { ...args, body: body });
  }

  async getBalanceOf(provider: ContractProvider, user: Address) {
    const builder = new TupleBuilder();
    builder.writeAddress(user);
    const source = (await provider.get('balanceOf', builder.build())).stack;
    const result = source.readBigNumber();
    return result;
  }

  async getIsPaused(provider: ContractProvider) {
    const builder = new TupleBuilder();
    const source = (await provider.get('isPaused', builder.build())).stack;
    const result = source.readBoolean();
    return result;
  }

  async getGetOwner(provider: ContractProvider) {
    const builder = new TupleBuilder();
    const source = (await provider.get('getOwner', builder.build())).stack;
    const result = source.readAddress();
    return result;
  }
}
