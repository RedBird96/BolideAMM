import {Fragment, Interface, JsonFragment} from "@ethersproject/abi";
import {CallOverrides, Contract} from "@ethersproject/contracts";
import {ethers} from "ethers";

export interface Call {
	name: string; // Function name on the contract (example: balanceOf)
	params?: unknown[]; // Function params
}

export interface MulticallOptions extends CallOverrides {
	limit?: number; // multicall pagination
}

export const multicall = async <T = any>(
	signerOrProvider: ethers.providers.JsonRpcProvider | ethers.Wallet,
	targetAddress: string,
	abi: string,
	calls: Call[],
	options?: MulticallOptions
): Promise<T[]> => {
	const multicallAbi = [
		"function multicall(bytes[] callDatas) returns (uint256 blockNumber, bytes[] returnData)",
	];
	const multi = new Contract(targetAddress, multicallAbi, signerOrProvider);
	const itf = new Interface(abi);
	try {
		const max = options?.limit || 500;
		// multicall pagination
		const pages = Math.ceil(calls.length / max);
		const promises: any = [];
		Array.from(Array(pages)).forEach((x, i) => {
			const callsInPage = calls.slice(max * i, max * (i + 1));
			promises.push(
				multi.multicall(
					callsInPage.map((call) =>
						itf.encodeFunctionData(call.name, call.params)
					),
					options || {}
				)
			);
		});
		// wait for promise result
		let results: any = await Promise.all(promises);

		return results;
	} catch (e) {
		return Promise.reject(e);
	}
};
