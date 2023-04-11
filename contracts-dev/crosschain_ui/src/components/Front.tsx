import React, { useEffect } from "react";
import { useHistory } from "react-router-dom";
import { StackLayout } from "@progress/kendo-react-layout";
import { Button } from "@progress/kendo-react-buttons";
import { Notification } from "@progress/kendo-react-notification";

import "../css/styles.scss";

declare var window: any;

const Front = () => {
  let history = useHistory();
  const [metamastInstalled, setMetamastInstalled] =
    React.useState<boolean>(false);

  const initWeb3 = async () => {
    const Web3 = require("web3");
    if (window.ethereum) {
      await window.ethereum.request({ method: "eth_requestAccounts" });
      window.web3 = new Web3(window.ethereum);
      try {
        window.ethereum.enable();
        setMetamastInstalled(true);
      } catch (err) {}
    } else if (window.web3) {
      setMetamastInstalled(true);
      return (window.web3 = new Web3(window.web3.currentProvider));
    } else {
      setMetamastInstalled(false);
    }
  };

  useEffect(() => {
    initWeb3();
  });

  return (
    <div>
      <div className="page-wrapper page-front">
        <StackLayout orientation="vertical" align={{ vertical: "top" }}>
          <div className="box header"></div>
          <StackLayout orientation="horizontal">
            <div className="box nav"></div>
            <div className="box content">
              <StackLayout
                orientation={"vertical"}
                align={{ vertical: "middle" }}
                style={{ height: "100%" }}
                gap={15}
              >
                <div className="box first">
                  {!metamastInstalled && (
                    <Notification
                      type={{ style: "error", icon: true }}
                      closable={false}
                    >
                      <span>
                        You need to install metamask from{" "}
                        <a href="https://metamask.io/">https://metamask.io/</a>.
                      </span>
                    </Notification>
                  )}
                  <Button
                    shape={"rectangle"}
                    size={"large"}
                    themeColor={"primary"}
                    fillMode={"solid"}
                    rounded={"full"}
                    onClick={() => {
                      history.push("/deposit");
                    }}
                    disabled={!metamastInstalled}
                  >
                    Crosschain Token Deposit
                  </Button>
                </div>
              </StackLayout>
            </div>
            <div className="box toc"></div>
          </StackLayout>
          <div className="box footer"></div>
        </StackLayout>
      </div>
    </div>
  );
};

export default Front;
