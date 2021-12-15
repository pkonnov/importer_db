import {Box, AppBar, Toolbar, Container} from "@material-ui/core";

import ImportDashboard from "./componets/ImportDashboard";

function App() {
  return (
      <Box>
          <AppBar position="static">
              <Toolbar />
          </AppBar>
          <Container maxWidth="sm">
            <ImportDashboard/>
          </Container>
      </Box>
  );
}

export default App;
