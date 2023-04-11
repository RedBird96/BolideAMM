import React, { useEffect } from "react";
import { render } from "react-dom";
import { BrowserRouter, Switch, Route } from "react-router-dom";
import styled from "styled-components";
import { Front, NotFound, Deposit } from "./components";
import "@progress/kendo-theme-default/dist/all.scss";

const StyledApp = styled.div`
  background-color: #f4f6f8;
  height: 100vh;
  padding: 1rem;
`;

function App() {
  return (
    <BrowserRouter>
      <StyledApp>
        <Switch>
          <Route path={"/"} exact component={Front} />
          <Route path={"/deposit"} exact component={Deposit} />
          <Route component={NotFound} />
        </Switch>
      </StyledApp>
    </BrowserRouter>
  );
}

const rootElement = document.getElementById("root");
render(<App />, rootElement);
