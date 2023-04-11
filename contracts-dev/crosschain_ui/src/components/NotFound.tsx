import React from "react";
import { useHistory } from "react-router-dom";
import { observer } from "mobx-react";

import '@progress/kendo-theme-default/dist/all.scss';
import '@progress/kendo-theme-default/dist/default-nordic.scss';
import { StackLayout } from "@progress/kendo-react-layout";
import { Button } from '@progress/kendo-react-buttons';

const NotFound = observer(() => {
  let history = useHistory();

  return (
    <>
      <div className="page-wrapper page-404">
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
                  Page not found.
                  <br />
                  <br />
                </div>
                <div className="box second">
                  <Button
                    fillMode="solid"
                    themeColor={"info"}
                    onClick={() => { history.push('/') }}
                  >
                    Go to Home
                  </Button>
                </div>
              </StackLayout>
            </div>
            <div className="box toc"></div>
          </StackLayout>
          <div className="box footer"></div>
        </StackLayout>
      </div>
    </>
  );
});

export default NotFound;
