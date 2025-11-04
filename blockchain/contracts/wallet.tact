import "@stdlib/deploy";

message(0x01) Deposit {}

message(0x02) Withdraw {
  amount: Int as coins;
}

message(0x03) AwardJetton {
  user: Address;
  amount: Int as coins;
}

message(0x04) Pause {
  flag: Bool;
}

message(0x05) EmergencyWithdraw {
  to: Address;
  amount: Int as coins;
}

contract WalletContract {
    owner: Address;
    paused: Bool;
    balances: map<Address, Int as coins>;
    jettonMaster: Address;
    withdrawFeeBps: Int;

    init(ownerAddr: Address, jettonMasterAddr: Address, withdrawFeeBps: Int) {
        self.owner = ownerAddr;
        self.paused = false;
        self.balances = map<Address, Int as coins> {};
        self.jettonMaster = jettonMasterAddr;
        self.withdrawFeeBps = withdrawFeeBps;
    }

  receive(msg: Deposit) {
    require(!self.paused, "paused");
    let sender = sender();
    let amount = context().value;
    require(amount > 0, "zero deposit");
    let prevMaybe = self.balances.get(sender);
    let prev: Int = 0;
    if (prevMaybe != null) {
      prev = prevMaybe!!;
    }
    self.balances.set(sender, prev + amount);
  }

  receive(msg: Withdraw) {
    require(!self.paused, "paused");
    let sender = sender();
    require(msg.amount > 0, "zero withdraw");
    let prevMaybe = self.balances.get(sender);
    let prev: Int = 0;
    if (prevMaybe != null) {
      prev = prevMaybe!!;
    }
    require(prev >= msg.amount, "insufficient");
    let fee = (msg.amount * self.withdrawFeeBps) / 10000;
    let net = msg.amount - fee;
    self.balances.set(sender, prev - msg.amount);
    message(MessageParameters{ to: sender, value: net, mode: SendIgnoreErrors });
    if (fee > 0) {
      message(MessageParameters{ to: self.owner, value: fee, mode: SendIgnoreErrors });
    }
  }

  receive(msg: AwardJetton) {
    require(sender() == self.owner, "only owner");
    // TODO: call jetton master transfer
  }

  receive(msg: Pause) {
    require(sender() == self.owner, "only owner");
    self.paused = msg.flag;
  }

  receive(msg: EmergencyWithdraw) {
    require(sender() == self.owner, "only owner");
    require(self.paused, "not paused");
    message(MessageParameters{ to: msg.to, value: msg.amount, mode: SendIgnoreErrors });
  }

  get fun balanceOf(user: Address): Int {
    let v = self.balances.get(user);
    if (v == null) {
      return 0;
    }
    return v!!;
  }

  get fun isPaused(): Bool {
    return self.paused;
  }

  get fun getOwner(): Address {
    return self.owner;
  }
}
