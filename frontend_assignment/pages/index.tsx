import detectEthereumProvider from "@metamask/detect-provider"
import { Strategy, ZkIdentity } from "@zk-kit/identity"
import { generateMerkleProof, Semaphore } from "@zk-kit/protocols"
import { providers, Contract, utils } from "ethers"
import Head from "next/head"
import React from "react"
import { useEffect } from "react"
import styles from "../styles/Home.module.css"
import { useForm, SubmitHandler } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from '@hookform/resolvers/yup';

import Greeter from "artifacts/contracts/Greeters.sol/Greeters.json"

const contract = new Contract("0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512", Greeter.abi)
const provider = new providers.JsonRpcProvider("http://127.0.0.1:8545/")
const contractOwner = contract.connect(provider.getSigner())

interface IFormInput {
    name: string;
    address: string;
    age: number;
}

const userSchema = yup.object({
    name: yup.string().required(),
    age: yup.number().required().positive().integer(),
    address: yup.string().required(),

}).required();

export default function Home() {
    const [logs, setLogs] = React.useState("Connect your wallet and greet!")

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors }
    } = useForm({
        resolver: yupResolver(userSchema)
    });
    const onSubmit = (data: any) => {
        alert(JSON.stringify(data));

    };

    contractOwner.on("NewGreeting", (result) => {
        alert(utils.parseBytes32String(result));

    })

    async function greet() {
        setLogs("Creating your Semaphore identity...")

        const provider = (await detectEthereumProvider()) as any

        await provider.request({ method: "eth_requestAccounts" })

        const ethersProvider = new providers.Web3Provider(provider)
        const signer = ethersProvider.getSigner()
        const message = await signer.signMessage("Sign this message to create your identity!")

        const identity = new ZkIdentity(Strategy.MESSAGE, message)
        const identityCommitment = identity.genIdentityCommitment()
        const identityCommitments = await (await fetch("./identityCommitments.json")).json()

        const merkleProof = generateMerkleProof(20, BigInt(0), identityCommitments, identityCommitment)

        setLogs("Creating your Semaphore proof...")

        const greeting = "Hello world"

        const witness = Semaphore.genWitness(
            identity.getTrapdoor(),
            identity.getNullifier(),
            merkleProof,
            merkleProof.root,
            greeting
        )

        const { proof, publicSignals } = await Semaphore.genProof(witness, "./semaphore.wasm", "./semaphore_final.zkey")
        const solidityProof = Semaphore.packToSolidityProof(proof)

        const response = await fetch("/api/greet", {
            method: "POST",
            body: JSON.stringify({
                greeting,
                nullifierHash: publicSignals.nullifierHash,
                solidityProof: solidityProof
            })
        })

        if (response.status === 500) {
            const errorMessage = await response.text()

            setLogs(errorMessage)
        } else {
            setLogs("Your anonymous greeting is onchain :)")
        }
    }

    return (
        <div className={styles.container}>
            <Head>
                <title>Greetings</title>
                <meta name="description" content="A simple Next.js/Hardhat privacy application with Semaphore." />
                <link rel="icon" href="/favicon.ico" />
            </Head>

            <main className={styles.main}>
                <h1 className={styles.title}>Greetings</h1>

                <form onSubmit={handleSubmit(onSubmit)}>
                    <label>Name</label>
                    <input
                        {...register("name")}
                    />
                    <p>{errors.name?.message}</p>

                    <label>Address</label>
                    <input {...register("address", { pattern: /^[A-Za-z]+$/i })} />
                    <p>{errors.address?.message}</p>

                    <label>Age</label>
                    <input {...register("age", { min: 18, max: 99 })} />
                    <p>{errors.age?.message}</p>

                    <input type="submit" />
                </form>

                <div className={styles.logs}>{logs}</div>

                <div onClick={() => greet()} className={styles.button}>
                    Greet
                </div>
            </main>
        </div>
    )
}
