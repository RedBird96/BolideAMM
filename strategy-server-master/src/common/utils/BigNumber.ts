import ExternalBigNumber from 'bignumber.js';

ExternalBigNumber.config({
  DECIMAL_PLACES: 18,
});

export class BigNumber extends ExternalBigNumber {
  public static max(...args: BigNumber[]): BigNumber {
    return BigNumber.wrapType(BigNumber.maximum(...args));
  }

  public static min(...args: BigNumber[]): BigNumber {
    return BigNumber.wrapType(BigNumber.minimum(...args));
  }

  public mul(arg: BigNumber): BigNumber {
    return BigNumber.wrapType(this.multipliedBy(arg));
  }

  public div(arg: BigNumber): BigNumber {
    return BigNumber.wrapType(this.dividedBy(arg));
  }

  public idiv(arg: BigNumber): BigNumber {
    return BigNumber.wrapType(this.dividedToIntegerBy(arg));
  }

  public add(arg: BigNumber): BigNumber {
    return BigNumber.wrapType(this.plus(arg));
  }

  public sub(arg: BigNumber): BigNumber {
    return BigNumber.wrapType(this.minus(arg));
  }

  public wMinus(arg: BigNumber): BigNumber {
    return BigNumber.wrapType(this.minus(arg));
  }

  public wTimes(arg: BigNumber): BigNumber {
    return BigNumber.wrapType(this.times(arg));
  }

  public wDividedBy(arg: BigNumber): BigNumber {
    return BigNumber.wrapType(this.dividedBy(arg));
  }

  public wExponentiatedBy(arg: BigNumber): BigNumber {
    return BigNumber.wrapType(this.exponentiatedBy(arg));
  }

  public wMultipliedBy(arg: BigNumber) {
    return BigNumber.wrapType(this.multipliedBy(arg));
  }

  public pow(n: BigNumber | number): BigNumber {
    return BigNumber.wrapType(this.exponentiatedBy(n));
  }

  public wPow(n: BigNumber | number): BigNumber {
    return BigNumber.wrapType(this.pow(n));
  }

  public wDp(
    decimalPlaces: number,
    roundingMode?: ExternalBigNumber.RoundingMode,
  ) {
    return BigNumber.wrapType(this.dp(decimalPlaces, roundingMode));
  }

  private static wrapType(value: ExternalBigNumber) {
    return new BigNumber(value.toString());
  }
}
