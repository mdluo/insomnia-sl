import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { shell } from 'electron';
import PropTypes from 'prop-types';
import autobind from 'autobind-decorator';
import * as classnames from 'classnames';
import * as globalActions from '../../redux/modules/global';
import Dropdown from '../base/dropdown/dropdown';
import DropdownDivider from '../base/dropdown/dropdown-divider';
import DropdownButton from '../base/dropdown/dropdown-button';
import DropdownItem from '../base/dropdown/dropdown-item';
import DropdownHint from '../base/dropdown/dropdown-hint';
import SettingsModal, { TAB_INDEX_EXPORT } from '../modals/settings-modal';
import * as models from '../../../models';
import { getAppVersion } from '../../../common/constants';
import { showModal, showPrompt } from '../modals/index';
import Link from '../base/link';
import WorkspaceSettingsModal from '../modals/workspace-settings-modal';
import WorkspaceShareSettingsModal from '../modals/workspace-share-settings-modal';
import * as session from '../../../sync/session';
import LoginModal from '../modals/login-modal';
import Tooltip from '../tooltip';
import * as hotkeys from '../../../common/hotkeys';
import KeydownBinder from '../keydown-binder';

@autobind
class WorkspaceDropdown extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      loggedIn: false,
    };
  }

  async _handleDropdownOpen() {
    if (this.state.loggedIn !== session.isLoggedIn()) {
      this.setState({ loggedIn: session.isLoggedIn() });
    }
  }

  async _handleDropdownHide() {
    // Mark all unseen workspace as seen
    for (const workspace of this.props.unseenWorkspaces) {
      const workspaceMeta = await models.workspaceMeta.getOrCreateByParentId(workspace._id);
      if (!workspaceMeta.hasSeen) {
        models.workspaceMeta.update(workspaceMeta, { hasSeen: true });
      }
    }
  }

  _setDropdownRef(n) {
    this._dropdown = n;
  }

  _handleShowLogin() {
    showModal(LoginModal);
  }

  _handleShowExport() {
    showModal(SettingsModal, TAB_INDEX_EXPORT);
  }

  _handleShowSettings() {
    showModal(SettingsModal);
  }

  _handleWorkspacePath() {
    const { activeWorkspace } = this.props;
    shell.showItemInFolder(activeWorkspace.description);
  }

  _handleWorkspaceLoad() {
    const { handleImportUriToWorkspace, activeWorkspace } = this.props;
    if (activeWorkspace.description) {
      handleImportUriToWorkspace(activeWorkspace._id, `file://${activeWorkspace.description}`);
    }
  }

  _handleWorkspaceSave() {
    const { handleExportWorkspaceToFile, activeWorkspace } = this.props;
    handleExportWorkspaceToFile(activeWorkspace._id);
  }

  _handleShowWorkspaceSettings() {
    showModal(WorkspaceSettingsModal, {
      workspace: this.props.activeWorkspace,
    });
  }

  _handleShowShareSettings() {
    showModal(WorkspaceShareSettingsModal, {
      workspace: this.props.activeWorkspace,
    });
  }

  _handleSwitchWorkspace(workspaceId) {
    this.props.handleSetActiveWorkspace(workspaceId);
  }

  _handleWorkspaceCreate() {
    showPrompt({
      title: 'Create New Workspace',
      defaultValue: 'My Workspace',
      submitName: 'Create',
      selectText: true,
      onComplete: async name => {
        const workspace = await models.workspace.create({ name });
        this.props.handleSetActiveWorkspace(workspace._id);
      },
    });
  }

  _handleKeydown(e) {
    hotkeys.executeHotKey(e, hotkeys.TOGGLE_MAIN_MENU, () => {
      this._dropdown && this._dropdown.toggle(true);
    });
  }

  render() {
    const {
      className,
      workspaces,
      activeWorkspace,
      unseenWorkspaces,
      isLoading,
      ...other
    } = this.props;

    const nonActiveWorkspaces = workspaces
      .filter(w => w._id !== activeWorkspace._id)
      .sort((w1, w2) => w1.name.localeCompare(w2.name));
    const addedWorkspaceNames = unseenWorkspaces.map(w => `"${w.name}"`).join(', ');
    const classes = classnames(className, 'wide', 'workspace-dropdown');

    const unseenWorkspacesMessage = (
      <div>
        The following workspaces were added<br />
        {addedWorkspaceNames}
      </div>
    );

    return (
      <KeydownBinder onKeydown={this._handleKeydown}>
        <Dropdown
          beside
          ref={this._setDropdownRef}
          className={classes}
          onOpen={this._handleDropdownOpen}
          onHide={this._handleDropdownHide}
          {...other}>
          <DropdownButton className="btn wide">
            <h1 className="no-pad text-left">
              <div className="pull-right">
                {isLoading ? <i className="fa fa-refresh fa-spin" /> : null}
                {unseenWorkspaces.length > 0 && (
                  <Tooltip message={unseenWorkspacesMessage} position="bottom">
                    <i className="fa fa-asterisk space-left" />
                  </Tooltip>
                )}
                <i className="fa fa-caret-down space-left" />
              </div>
              {activeWorkspace.name}
            </h1>
          </DropdownButton>
          <DropdownDivider>Current Workspace</DropdownDivider>
          <DropdownItem onClick={this._handleWorkspacePath}>
            <i className="fa fa-file" /> {activeWorkspace.description || 'Unsaved Workspace'}
          </DropdownItem>
          <DropdownItem onClick={this._handleWorkspaceLoad}>
            <i className="fa fa-folder-open" /> Load workspace
          </DropdownItem>
          <DropdownItem onClick={this._handleWorkspaceSave}>
            <i className="fa fa-save" /> Save Workspace
          </DropdownItem>
          <DropdownItem onClick={this._handleShowWorkspaceSettings}>
            <i className="fa fa-wrench" /> Workspace Settings
            <DropdownHint hotkey={hotkeys.SHOW_WORKSPACE_SETTINGS} />
          </DropdownItem>

          <DropdownDivider>Switch Workspace</DropdownDivider>

          {nonActiveWorkspaces.map(w => {
            const isUnseen = !!unseenWorkspaces.find(v => v._id === w._id);
            return (
              <DropdownItem key={w._id} onClick={this._handleSwitchWorkspace} value={w._id}>
                <i className="fa fa-random" /> To <strong>{w.name}</strong>
                {isUnseen && (
                  <Tooltip message="This workspace is new">
                    <i className="width-auto fa fa-asterisk surprise" />
                  </Tooltip>
                )}
              </DropdownItem>
            );
          })}

          <DropdownItem onClick={this._handleWorkspaceCreate}>
            <i className="fa fa-plus" /> New Workspace
          </DropdownItem>

          <DropdownDivider>Insomnia Version {getAppVersion()}</DropdownDivider>

          <DropdownItem onClick={this._handleShowSettings}>
            <i className="fa fa-cog" /> Preferences
            <DropdownHint hotkey={hotkeys.SHOW_SETTINGS} />
          </DropdownItem>
          <DropdownItem onClick={this._handleShowExport}>
            <i className="fa fa-share" /> Import/Export
          </DropdownItem>

          {/* Not Logged In */}

          {!this.state.loggedIn && (
            <DropdownItem key="login" onClick={this._handleShowLogin}>
              <i className="fa fa-sign-in" /> Log In
            </DropdownItem>
          )}

          {!this.state.loggedIn && (
            <DropdownItem
              key="invite"
              buttonClass={Link}
              href="https://insomnia.rest/pricing/"
              button>
              <i className="fa fa-users" /> Upgrade to Plus
              <i className="fa fa-star surprise fa-outline" />
            </DropdownItem>
          )}
        </Dropdown>
      </KeydownBinder>
    );
  }
}

WorkspaceDropdown.propTypes = {
  // Required
  isLoading: PropTypes.bool.isRequired,
  handleImportFile: PropTypes.func.isRequired,
  handleExportFile: PropTypes.func.isRequired,
  handleSetActiveWorkspace: PropTypes.func.isRequired,
  workspaces: PropTypes.arrayOf(PropTypes.object).isRequired,
  unseenWorkspaces: PropTypes.arrayOf(PropTypes.object).isRequired,
  activeWorkspace: PropTypes.object.isRequired,

  // Optional
  className: PropTypes.string,
};

function mapDispatchToProps(dispatch) {
  const global = bindActionCreators(globalActions, dispatch);

  return {
    handleImportUriToWorkspace: global.importUri,
    handleExportWorkspaceToFile: global.saveToFile,
  };
}

export default connect(
  () => ({}),
  mapDispatchToProps,
)(WorkspaceDropdown);
